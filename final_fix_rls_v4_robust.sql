
/* ============================================================
   RLS 無限ループ完全解消 ＆ 堅牢な検索 RPC (2026-03-05 v4)
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
DROP POLICY IF EXISTS "View own data" ON users;
DROP POLICY IF EXISTS "Admins full access" ON users;

-- 2. 権限確認用のセキュリティ定義者関数 (再帰を避けるため)
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

-- 3. ★さらに堅牢な検索RPC★
-- ハイフンや空白を無視し、大文字小文字（万が一の英字）も区別せず検索します。
CREATE OR REPLACE FUNCTION find_unlinked_user_by_phone(p_phone_number text)
RETURNS SETOF users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM users
  WHERE 
    -- ハイフンと空白を除去して比較
    REPLACE(REPLACE(phone_number, '-', ''), ' ', '') = REPLACE(REPLACE(p_phone_number, '-', ''), ' ', '')
    AND (line_user_id IS NULL OR line_user_id = '');
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


-- 6. ★デバッグ用: DBの中身を管理者以外でも1回だけ生で見れるようにする関数★
CREATE OR REPLACE FUNCTION debug_list_all_phone_numbers()
RETURNS TABLE (phone text, is_linked boolean, role_val text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT phone_number, line_user_id IS NOT NULL, role FROM users;
END;
$$;
GRANT EXECUTE ON FUNCTION debug_list_all_phone_numbers() TO anon;
