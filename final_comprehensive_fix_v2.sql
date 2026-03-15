
-- ============================================================
-- 【修正版】権限とデータ表示の最終修正 (2026-03-14)
-- 1. 管理者用RPCの更新 (MANAGERロール許可)
-- 2. 各テーブルの RLS 調整 (店舗名を 'stores' に修正)
-- ============================================================

-- 1. 管理者用権限変更RPC (MANAGERも許可するように修正)
CREATE OR REPLACE FUNCTION toggle_user_permission_admin(
  p_operator_line_id TEXT,
  p_target_user_id UUID,
  p_permission TEXT,
  p_location_id UUID,
  p_should_enable BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_operator_role TEXT;
BEGIN
  -- 演算者（ログインユーザー）のロールを確認
  SELECT role INTO v_operator_role FROM users WHERE line_user_id = p_operator_line_id;
  
  -- ADMIN/EXECUTIVE/PRESIDENT/MANAGER でなければ拒否
  IF v_operator_role IS NULL OR v_operator_role NOT IN ('ADMIN', 'EXECUTIVE', 'PRESIDENT', 'MANAGER') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied: Operator role is ' || COALESCE(v_operator_role, 'NULL'));
  END IF;

  -- 権限の更新
  IF p_should_enable THEN
    IF p_location_id IS NULL THEN
        INSERT INTO user_permissions (user_id, permission, location_id)
        VALUES (p_target_user_id, p_permission, NULL)
        ON CONFLICT (user_id, permission) WHERE location_id IS NULL DO NOTHING;
    ELSE
        INSERT INTO user_permissions (user_id, permission, location_id)
        VALUES (p_target_user_id, p_permission, p_location_id)
        ON CONFLICT (user_id, permission, location_id) WHERE location_id IS NOT NULL DO NOTHING;
    END IF;
  ELSE
    IF p_location_id IS NULL THEN
        DELETE FROM user_permissions WHERE user_id = p_target_user_id AND permission = p_permission AND location_id IS NULL;
    ELSE
        DELETE FROM user_permissions WHERE user_id = p_target_user_id AND permission = p_permission AND location_id = p_location_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION toggle_user_permission_admin(TEXT, UUID, TEXT, UUID, BOOLEAN) TO anon, authenticated;


-- 2. RLSポリシーの調整 (データが表示されない問題の修正)
-- ※ 'locations' ではなく 'stores' を使用します

-- users
DROP POLICY IF EXISTS "Allow anon read users" ON public.users;
CREATE POLICY "Allow anon read users" ON public.users 
  FOR SELECT TO anon, authenticated USING (true);

-- shifts
DROP POLICY IF EXISTS "Allow anon read shifts" ON public.shifts;
CREATE POLICY "Allow anon read shifts" ON public.shifts 
  FOR SELECT TO anon, authenticated USING (true);

-- stores (旧 locations)
DROP POLICY IF EXISTS "Allow anon read stores" ON public.stores;
CREATE POLICY "Allow anon read stores" ON public.stores 
  FOR SELECT TO anon, authenticated USING (true);

-- user_permissions
DROP POLICY IF EXISTS "Allow read for all" ON public.user_permissions;
CREATE POLICY "Allow read for all" ON public.user_permissions 
  FOR SELECT TO authenticated, anon USING (true);

-- attendances
DROP POLICY IF EXISTS "Allow anon read attendances" ON public.attendances;
CREATE POLICY "Allow anon read attendances" ON public.attendances 
  FOR SELECT TO anon, authenticated USING (true);
