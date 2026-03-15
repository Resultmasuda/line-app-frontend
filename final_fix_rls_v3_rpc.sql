
/* ============================================================
   RLS 無限ループ完全解消 ＆ 認証チェック用 RPC (2026-03-05 v3)
   ============================================================ */

-- 1. 既存の競合するポリシーを一旦すべて削除
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Allow select for registration" ON users;
DROP POLICY IF EXISTS "Allow users to see their own record" ON users;
DROP POLICY IF EXISTS "Allow admins to manage all users" ON users;
DROP POLICY IF EXISTS "Public can view users basic info for join" ON users;
DROP POLICY IF EXISTS "Anyone can select for auth check" ON users;
DROP POLICY IF EXISTS "Allow registration check" ON users;
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Admins manage all" ON users;
DROP POLICY IF EXISTS "Service role full access" ON users;

-- 2. セキュリティ定義者関数 (RLSをバイパスして権限をチェック)
CREATE OR REPLACE FUNCTION check_user_role(target_user_id uuid, required_roles text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = target_user_id 
    AND role = ANY(string_to_array(required_roles, ','))
  );
END;
$$;

-- 3. ★新設: 認証前でも安全にユーザーを確認できるRPC★
-- セキュリティ定義者にすることで RLS の無限ループを回避しつつ、
-- 「存在するが未連携」のユーザーだけを返します。
CREATE OR REPLACE FUNCTION find_unlinked_user_by_phone(p_phone_number text)
RETURNS SETOF users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM users
  WHERE phone_number = p_phone_number
  AND line_user_id IS NULL;
END;
$$;

-- 4. RLSポリシーを極限までシンプルにする (無限ループの芽を摘む)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- A. 自分のデータは見れる (これは再帰しない)
CREATE POLICY "View own data" 
ON users FOR SELECT 
TO authenticated
USING (line_user_id = auth.uid()::text);

-- B. 管理者用 (無限ループ回避のため関数を噛ませる)
CREATE POLICY "Admins full access" 
ON users FOR ALL 
TO authenticated
USING (
  check_user_role(
    (SELECT id FROM users WHERE line_user_id = auth.uid()::text LIMIT 1), 
    'ADMIN,MANAGER'
  )
);

-- C. サービスロール用 (全許可)
CREATE POLICY "Service role full access" 
ON users FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- 5. RPCを一般公開 (anonでも呼べるようにする)
GRANT EXECUTE ON FUNCTION find_unlinked_user_by_phone(text) TO anon, authenticated;
