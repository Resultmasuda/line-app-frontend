
/* ============================================================
   RLS 無限ループ修正用 最終SQL (2026-03-05)
   ============================================================ */

-- 1. 既存の競合するポリシーを一旦すべて削除
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Allow select for registration" ON users;
DROP POLICY IF EXISTS "Allow users to see their own record" ON users;
DROP POLICY IF EXISTS "Allow admins to manage all users" ON users;
DROP POLICY IF EXISTS "Public can view users basic info for join" ON users;
DROP POLICY IF EXISTS "Anyone can select for auth check" ON users;

-- 2. 権限確認用のセキュリティ定義者関数 (再帰を避けるため)
-- security definer を付けることで RLS をバイパスして自身のテーブルを読める
CREATE OR REPLACE FUNCTION check_user_role(target_user_id uuid, required_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = target_user_id AND role = ANY(string_to_array(required_role, ','));
  );
END;
$$;

-- 3. 基本ポリシーの再定義
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- A. 特例: 未認証の状態でも電話番号による「照会」だけは許可する
-- (auth.uid() が null の場合でも、特定のカラム選択に限定することは難しいため、
--  registration screen での .eq('phone_number', ...) を通すために SELECT を許可)
CREATE POLICY "Allow registration check" 
ON users FOR SELECT 
TO anon, authenticated
USING (line_user_id IS NULL);

-- B. ログイン済みユーザーが自分の情報を守る・見る
CREATE POLICY "Users can view own data" 
ON users FOR SELECT 
TO authenticated
USING (line_user_id = auth.uid()::text);

-- C. 管理者(ADMIN/MANAGER)は全ユーザーを見れる・編集できる
-- 直接自身のテーブルを SELECT すると無限ループするので関数を使う
CREATE POLICY "Admins manage all" 
ON users FOR ALL 
TO authenticated
USING (
  check_user_role(
    (SELECT id FROM users WHERE line_user_id = auth.uid()::text LIMIT 1), 
    'ADMIN,MANAGER'
  )
);

-- D. サービスロール用 (全許可)
CREATE POLICY "Service role full access" 
ON users FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

/*
重要: 
もし上記でも「見つからない」と言われる場合、
そもそも phone_number カラムに 080... のような形式でデータが入っているか確認してください。
*/
