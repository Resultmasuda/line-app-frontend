-- ============================================================
-- 権限管理システム用テーブル作成 (2026-03-08) - 改訂版
-- 販路（Location）ごとの権限 ＋ マスター権限
-- ============================================================

-- 1. 権限管理テーブルの作成
-- user_id: ユーザーID
-- location_id: 販路ID (NULLの場合は全販路共通、または特定のアクション)
-- permission: 権限識別子 (MANAGE_SHIFTS, VIEW_EXPENSES 等)
-- is_master: TRUE の場合、全ての販路に対してその権限を持つ
CREATE TABLE IF NOT EXISTS public.user_permissions (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  is_master BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, permission, location_id)
);

-- ユニーク制約: location_idがNULLの場合（グローバル設定用）の考慮が必要なため、
-- Postgresの標準ではNULLは重複を許容しますが、今回はUI側とロジックで制御します。
-- もしグローバルマスター設定を1つだけに限定したい場合は下記のような部分インデックスが有効です。
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_permission_global 
ON public.user_permissions (user_id, permission) 
WHERE location_id IS NULL;

-- 2. RLS (Row Level Security) の有効化
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- 3. ポリシー設定
-- 認証済みユーザーは自分の権限を確認できる、または他人の権限を閲覧できる（管理画面用）
CREATE POLICY "Allow read for authenticated users" ON public.user_permissions
  FOR SELECT TO authenticated USING (true);

-- 社長、幹部、または管理者は全ての権限を操作できる
CREATE POLICY "Allow all for admins" ON public.user_permissions
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND (users.role IN ('PRESIDENT', 'EXECUTIVE', 'ADMIN'))
    )
  );
