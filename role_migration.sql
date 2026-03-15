/* ============================================================
   ロール移行SQL (2026-03-05)
   
   旧ロール体系 → 新ロール体系
     ADMIN   → PRESIDENT（社長）or EXECUTIVE（幹部）
     MANAGER → MANAGER（役職社員）のまま
     STAFF   → STAFF（社員）のまま
   
   ※ 各ユーザーを適切なロールに設定してください
   ============================================================ */

-- ★ まず全ADMINを一旦 EXECUTIVE(幹部) に変更
UPDATE users SET role = 'EXECUTIVE' WHERE role = 'ADMIN';

-- ★ 社長は個別に PRESIDENT に設定（下田さんを社長にする場合の例）
-- 必要に応じてコメントを外して実行してください
-- UPDATE users SET role = 'PRESIDENT' WHERE display_name = '下田';

-- ★ 増田を役職社員に設定（ただしスーパーAdmin権限は自動保持）
UPDATE users SET role = 'MANAGER' WHERE display_name LIKE '%増田%';

-- ★ 確認用
SELECT display_name, role FROM users ORDER BY 
  CASE role 
    WHEN 'PRESIDENT' THEN 1 
    WHEN 'EXECUTIVE' THEN 2 
    WHEN 'MANAGER' THEN 3 
    WHEN 'STAFF' THEN 4 
  END;
