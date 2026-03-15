
/* ============================================================
   ★ プロジェクト・マスターSQL (2026-03-05 集約版) ★
   これまでの修正（RLS、無限ループ対策、属性追加）をすべて含みます。
   既存のSQLタブを整理したい場合は、これを1回実行して不要なタブを削除してください。
   ============================================================ */

-- 1. 既存の古いポリシーをリセット
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

-- 2. 権限確認・検索用 RPC 関数の定義
-- (RLSの無限再帰を避けるために SECURITY DEFINER を使用)

CREATE OR REPLACE FUNCTION check_user_role(target_user_id uuid, required_roles text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = target_user_id 
    AND role = ANY(string_to_array(required_roles, ','))
  );
END;
$$;

CREATE OR REPLACE FUNCTION find_unlinked_user_by_phone(p_phone_number text)
RETURNS SETOF users LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM users
  WHERE 
    REPLACE(REPLACE(phone_number, '-', ''), ' ', '') = REPLACE(REPLACE(p_phone_number, '-', ''), ' ', '')
    AND (line_user_id IS NULL OR line_user_id = '');
END;
$$;

-- 3. RLS ポリシーの最終適用
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own data" ON users FOR SELECT TO authenticated
USING (line_user_id = auth.uid()::text);

CREATE POLICY "Admins full access" ON users FOR ALL TO authenticated
USING (check_user_role((SELECT id FROM users WHERE line_user_id = auth.uid()::text LIMIT 1), 'ADMIN,MANAGER'));

CREATE POLICY "Service role full access" ON users FOR ALL TO service_role 
USING (true) WITH CHECK (true);

-- 4. 権限の許可
GRANT EXECUTE ON FUNCTION find_unlinked_user_by_phone(text) TO anon, authenticated;

-- (おまけ) 打刻・シフト・店舗の RLS も基本的には authenticated を通すように整理されている前提です。
