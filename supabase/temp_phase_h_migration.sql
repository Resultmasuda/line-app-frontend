-- フェーズH: 店舗マスタの柔軟化と所属スタッフの紐付け
-- SupabaseのSQLエディタで以下のコマンドを実行してください

-- 1. 緯度・経度・許容範囲を必須から任意（変更可能）に変更
ALTER TABLE public.stores ALTER COLUMN latitude DROP NOT NULL;
ALTER TABLE public.stores ALTER COLUMN longitude DROP NOT NULL;
ALTER TABLE public.stores ALTER COLUMN radius_m DROP NOT NULL;
ALTER TABLE public.stores ALTER COLUMN radius_m DROP DEFAULT;

-- 2. 所属スタッフを管理するためのカラム（UUIDの配列）を新規追加
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS affiliated_staff UUID[] DEFAULT '{}';
