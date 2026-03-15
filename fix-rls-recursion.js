const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');

let url = '';
let key = '';
for (const line of envFile.split('\n')) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim().replace(/^"|"$/g, '');
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim().replace(/^"|"$/g, '');
}

const supabase = createClient(url, key);

async function runFix() {
    console.log("Applying RLS Recursion Fix...");

    // RPC 'execute_sql_query' が存在することを前提としています（前回の作業で作成済みのはず）
    const sql = `
      -- 1. 古いポリシーを完全に削除
      DROP POLICY IF EXISTS "Users can update own display name" ON public.users;
      DROP POLICY IF EXISTS "Users are viewable by everyone" ON public.users;
      DROP POLICY IF EXISTS "Allow full access to users" ON public.users;

      -- 2. セキュリティ定義者関数を作成（RLSをバイパスしてロールを確認するため）
      -- これにより、usersテーブルのポリシー内でusersテーブルを参照しても無限ループにならない
      CREATE OR REPLACE FUNCTION public.is_admin()
      RETURNS BOOLEAN AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1 FROM public.users 
          WHERE id = auth.uid() AND role = 'ADMIN'
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      CREATE OR REPLACE FUNCTION public.is_manager_or_admin()
      RETURNS BOOLEAN AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1 FROM public.users 
          WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER')
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      -- 3. 新しいポリシーの適用
      -- 閲覧は全員（無限ループなし）
      CREATE POLICY "Users are viewable by everyone" ON public.users FOR SELECT USING (true);
      
      -- 更新は「本人」または「管理者」
      CREATE POLICY "Users can be updated by self or admin" ON public.users FOR UPDATE
        USING (auth.uid() = id OR is_admin())
        WITH CHECK (auth.uid() = id OR is_admin());

      -- 挿入と削除も同様（スタッフ一覧の追加・削除用）
      CREATE POLICY "Users can be managed by admin" ON public.users FOR ALL
        USING (is_admin())
        WITH CHECK (is_admin());
    `;

    const { data, error } = await supabase.rpc('execute_sql_query', { sql_text: sql });

    if (error) {
        console.error('Fix failed:', error);
    } else {
        console.log('Fix applied successfully!');
    }
}

runFix();
