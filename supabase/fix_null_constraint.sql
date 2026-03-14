-- line_user_id を必須ではなくする (NULLを許容)
-- これにより、LINE連携前のスタッフを事前登録できるようになります。
ALTER TABLE public.users ALTER COLUMN line_user_id DROP NOT NULL;
