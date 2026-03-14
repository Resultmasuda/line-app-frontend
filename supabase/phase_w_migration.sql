-- Phase W: Role-groups & Task Calendars
-- このSQLをSupabaseのSQL Editorで実行してください。

-- 1. shiftsテーブルへのカラム追加
-- シフトの種類（出勤、タスク、面談など）を区別するためのカラムを追加
ALTER TABLE public.shifts 
ADD COLUMN IF NOT EXISTS shift_type TEXT NOT NULL DEFAULT 'work';

-- 2. storesテーブルのtypeカラムに対するインデックス（もし前段階で追加されていなければ）
CREATE INDEX IF NOT EXISTS idx_shifts_shift_type ON public.shifts(shift_type);

-- すでに登録済みの店舗を 'store' (通常の物理店舗) としておく
UPDATE public.stores SET type = 'store' WHERE type IS NULL;
