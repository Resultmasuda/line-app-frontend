-- Phase U: Preset Colors, Publish Workflow & Schema Prep
-- このSQLをSupabaseのSQL Editorで実行してください。

-- 1. shiftsテーブルへのカラム追加
ALTER TABLE public.shifts 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS planned_wake_up_time TIME,
ADD COLUMN IF NOT EXISTS planned_leave_time TIME,
ADD COLUMN IF NOT EXISTS daily_memo TEXT;

-- 2. storesテーブルへのカラム追加
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'store';

-- 3. インデックスの追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_shifts_status ON public.shifts(status);
CREATE INDEX IF NOT EXISTS idx_stores_type ON public.stores(type);

-- 4. 既存のデータに対するデフォルト値の設定（必要に応じて）
-- すでにデータがある場合、すべて 'published' にしたい場合は以下を実行してください
-- UPDATE public.shifts SET status = 'published';
