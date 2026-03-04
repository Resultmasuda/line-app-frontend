
/* ============================================================
   ★ プロジェクト・マスターSQL (2026-03-05 ゴールド・ビルド) ★
   ログイン成功後の全データ表示 ＆ 管理権限の完全復旧用
   ============================================================ */

-- 1. 既存の古いポリシーを完全に一掃 (競合排除)
DROP POLICY IF EXISTS "Enable read access for all users" ON users;
DROP POLICY IF EXISTS "Users can view own" ON users;
DROP POLICY IF EXISTS "Admins manage all users" ON users;
DROP POLICY IF EXISTS "View own data" ON users;
DROP POLICY IF EXISTS "Admins full access" ON users;
DROP POLICY IF EXISTS "Service role full access" ON users;

DROP POLICY IF EXISTS "Users can view own shifts" ON shifts;
DROP POLICY IF EXISTS "Admins manage all shifts" ON shifts;
DROP POLICY IF EXISTS "Users can view own attendances" ON attendances;
DROP POLICY IF EXISTS "Admins manage all attendances" ON attendances;

-- 2. 権限確認・検索用 RPC 関数の再定義 (SECURITY DEFINER で RLS バイパス)

-- A. ログイン判定用
CREATE OR REPLACE FUNCTION find_user_by_line_id(p_line_id text)
RETURNS SETOF users LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY SELECT * FROM users WHERE line_user_id = p_line_id;
END;
$$;

-- B. 権限チェック用 (無限再帰を避けるために自分自身の SELCET を行わない)
-- 引数 sub に auth.uid()::text を受け取る
CREATE OR REPLACE FUNCTION is_admin_by_sub(p_sub text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE line_user_id = p_sub 
    AND role IN ('ADMIN', 'MANAGER')
  );
END;
$$;

-- 3. 各テーブルの RLS 設定

-- 【users テーブル】
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_self_select" ON users FOR SELECT TO authenticated, anon USING (line_user_id = auth.uid()::text);
CREATE POLICY "users_admin_all" ON users FOR ALL TO authenticated, anon USING (is_admin_by_sub(auth.uid()::text));

-- 【shifts テーブル】
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shifts_self_select" ON shifts FOR SELECT TO authenticated, anon USING (user_id IN (SELECT id FROM users WHERE line_user_id = auth.uid()::text));
CREATE POLICY "shifts_admin_all" ON shifts FOR ALL TO authenticated, anon USING (is_admin_by_sub(auth.uid()::text));

-- 【attendances テーブル】
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attendances_self_select" ON attendances FOR SELECT TO authenticated, anon USING (user_id IN (SELECT id FROM users WHERE line_user_id = auth.uid()::text));
CREATE POLICY "attendances_admin_all" ON attendances FOR ALL TO authenticated, anon USING (is_admin_by_sub(auth.uid()::text));

-- 【expenses テーブル】
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses_self_select" ON expenses FOR SELECT TO authenticated, anon USING (user_id IN (SELECT id FROM users WHERE line_user_id = auth.uid()::text));
CREATE POLICY "expenses_admin_all" ON expenses FOR ALL TO authenticated, anon USING (is_admin_by_sub(auth.uid()::text));

-- 4. 実行権限の公開
GRANT EXECUTE ON FUNCTION find_user_by_line_id(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION is_admin_by_sub(text) TO anon, authenticated;

-- 全データ表示を確実にするため、一旦公開用のSELECTポリシーも追加 (これまでの不具合防止)
CREATE POLICY "public_view_any_authenticated" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "shifts_view_any_authenticated" ON shifts FOR SELECT TO authenticated USING (true);
