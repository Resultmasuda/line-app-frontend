
-- ============================================================
-- 権限管理システムの徹底修正 (2026-03-13)
-- 1. RLSのバイパス (RPC導入)
-- 2. NULL location_id の許容
-- 3. anon 読み取りの許可
-- ============================================================

-- 1. テーブル構造の調整 (PrimaryKeyが NULL location_id を阻害している可能性があるため)
-- 既存のPKを削除し、ユニークインデックスで代用する
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'user_permissions' AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE public.user_permissions DROP CONSTRAINT user_permissions_pkey;
    END IF;
END $$;

-- location_id を NULL 許容に変更 (PK解除後)
ALTER TABLE public.user_permissions ALTER COLUMN location_id DROP NOT NULL;

-- ユニークインデックスの再整備
DROP INDEX IF EXISTS idx_user_permission_global;
CREATE UNIQUE INDEX idx_user_permission_global ON public.user_permissions (user_id, permission) WHERE location_id IS NULL;

DROP INDEX IF EXISTS idx_user_permission_specific;
CREATE UNIQUE INDEX idx_user_permission_specific ON public.user_permissions (user_id, permission, location_id) WHERE location_id IS NOT NULL;


-- 2. ★本命の修正：管理者用権限変更RPC★
-- SECURITY DEFINER により RLS をバイパスし、内部でロールチェックを行う
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
  -- 1. 演算者（ログインユーザー）のロールを確認 (LINE IDで検索)
  SELECT role INTO v_operator_role FROM users WHERE line_user_id = p_operator_line_id;
  
  -- 2. ADMIN/EXECUTIVE/PRESIDENT/MANAGER でなければ拒否
  IF v_operator_role IS NULL OR v_operator_role NOT IN ('ADMIN', 'EXECUTIVE', 'PRESIDENT', 'MANAGER') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied: Operator role is ' || COALESCE(v_operator_role, 'NULL'));
  END IF;

  -- 3. 権限の更新
  IF p_should_enable THEN
    -- 重複を考慮した挿入
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
    -- 削除
    IF p_location_id IS NULL THEN
        DELETE FROM user_permissions
        WHERE user_id = p_target_user_id
        AND permission = p_permission
        AND location_id IS NULL;
    ELSE
        DELETE FROM user_permissions
        WHERE user_id = p_target_user_id
        AND permission = p_permission
        AND location_id = p_location_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- RPCを anon/authenticated に公開
GRANT EXECUTE ON FUNCTION toggle_user_permission_admin(TEXT, UUID, TEXT, UUID, BOOLEAN) TO anon, authenticated;


-- 3. RLS ポリシーの調整 (読み取りを anon にも開放)
DROP POLICY IF EXISTS "Allow read for authenticated users" ON public.user_permissions;
DROP POLICY IF EXISTS "Allow read for all" ON public.user_permissions;

CREATE POLICY "Allow read for all" ON public.user_permissions
  FOR SELECT TO authenticated, anon USING (true);

-- 書き込みはRPC経由を推奨するが、一応ポリシーも修正 (オプション)
-- ただし今回はRPCで完全に解決するため、既存の書き込みポリシーは削除するか、そのままでもRPCが優先される
