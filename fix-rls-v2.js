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
    console.log("Applying RLS Recursion Fix (v2)...");

    const sql = `
      DROP POLICY IF EXISTS "Users can update own display name" ON public.users;
      DROP POLICY IF EXISTS "Users are viewable by everyone" ON public.users;
      DROP POLICY IF EXISTS "Allow full access to users" ON public.users;
      DROP POLICY IF EXISTS "Users can be updated by self or admin" ON public.users;
      DROP POLICY IF EXISTS "Users can be managed by admin" ON public.users;

      CREATE OR REPLACE FUNCTION public.is_admin()
      RETURNS BOOLEAN AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1 FROM public.users 
          WHERE id = auth.uid() AND role = 'ADMIN'
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      CREATE POLICY "Users are viewable by everyone" ON public.users FOR SELECT USING (true);
      
      CREATE POLICY "Users can be updated by self or admin" ON public.users FOR UPDATE
        USING (auth.uid() = id OR is_admin())
        WITH CHECK (auth.uid() = id OR is_admin());

      CREATE POLICY "Users can be managed by admin" ON public.users FOR ALL
        USING (is_admin())
        WITH CHECK (is_admin());
    `;

    // Try 'execute_sql' which was used in migrate.js
    const { data: data1, error: error1 } = await supabase.rpc('execute_sql', { query: sql });
    if (!error1) {
        console.log('Fix applied successfully via execute_sql!');
        return;
    }
    console.log('execute_sql failed, trying execute_sql_query...');

    // Try 'execute_sql_query' which was used in run_query.js
    const { data: data2, error: error2 } = await supabase.rpc('execute_sql_query', { sql_text: sql });
    if (!error2) {
        console.log('Fix applied successfully via execute_sql_query!');
        return;
    }

    console.error('Both RPCs failed.');
    console.error('Error 1:', error1);
    console.error('Error 2:', error2);
}

runFix();
