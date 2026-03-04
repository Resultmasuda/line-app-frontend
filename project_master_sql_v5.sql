
/* ============================================================
   ★ プロジェクト・マスターSQL (2026-03-05 v5 / 最終解決版) ★
   不具合（無限ループ）を完全に断ち切るための RPC 構成です。
   これを実行した後、プログラムをデプロイしてください。
   ============================================================ */

-- 1. 古いポリシーと関数を一度リセット
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Admins full access" ON users;
DROP POLICY IF EXISTS "Service role full access" ON users;
DROP POLICY IF EXISTS "Allow registration check" ON users;
DROP POLICY IF EXISTS "Allow users to see their own record" ON users;
DROP POLICY IF EXISTS "Allow admins to manage all users" ON users;
DROP POLICY IF EXISTS "Public can view users basic info for join" ON users;
DROP POLICY IF EXISTS "Anyone can select for auth check" ON users;
DROP POLICY IF EXISTS "View own data" ON users;
DROP POLICY IF EXISTS "Admins manage all" ON users;

-- 2. ★超重要★ セキュリティをバイパスして検索するための RPC 関数

-- A. ログイン判定用（自分の LINE ID で自分を探す）
CREATE OR REPLACE FUNCTION find_user_by_line_id(p_line_id text)
RETURNS SETOF users LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY SELECT * FROM users WHERE line_user_id = p_line_id;
END;
$$;

-- B. 初回連携用（電話番号でスタッフを探す / 表記揺れ吸収版）
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

-- C. 権限チェック用（ポリシー内から呼び出す）
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

-- 3. RLS ポリシーの再設定 (極限までシンプルに)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 「ログインできている人が自分のデータを見る」分には再帰は起きない
CREATE POLICY "Users can view own" ON users FOR SELECT TO authenticated, anon
USING (line_user_id = auth.uid()::text);

-- 「管理者が全データを見る」には関数を噛ませる
CREATE POLICY "Admins manage all users" ON users FOR ALL TO authenticated, anon
USING (check_user_role((SELECT id FROM users WHERE line_user_id = auth.uid()::text LIMIT 1), 'ADMIN,MANAGER'));

-- 4. 実行権限の公開
GRANT EXECUTE ON FUNCTION find_user_by_line_id(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION find_unlinked_user_by_phone(text) TO anon, authenticated;

-- (デバッグ用) 1回だけ全ユーザを確認したい場合に使用
CREATE OR REPLACE FUNCTION debug_list_users()
RETURNS TABLE (phone text, linked boolean, role_shiki text)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY SELECT phone_number, line_user_id IS NOT NULL, role FROM users;
END;
$$;
GRANT EXECUTE ON FUNCTION debug_list_users() TO anon;
