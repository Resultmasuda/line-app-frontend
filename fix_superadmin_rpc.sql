
-- 権限更新用RPCの修正: 特権ユーザーのLINE IDを明示的に許可する
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
  
  -- 特権ユーザー（増田・りょーた）のLINE ID、または ADMIN/EXECUTIVE/PRESIDENT/MANAGER のロールであれば許可
  IF p_operator_line_id IN ('U5500ee9357c696d9363027566c54a3bd', 'U408cf442303ae393c96a27c10a006950') 
     OR (v_operator_role IS NOT NULL AND v_operator_role IN ('ADMIN', 'EXECUTIVE', 'PRESIDENT', 'MANAGER')) THEN
    
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
  ELSE
    -- 許可されていない場合のみエラーを返す
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied: Operator role is ' || COALESCE(v_operator_role, 'NULL'));
  END IF;
END;
$$;
