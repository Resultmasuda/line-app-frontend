-- ==========================================
-- 業務ツール用 Supabase データベース初期構築スクリプト
-- ==========================================

-- 1. ユーザー管理テーブル (users)
-- LINEアカウントと紐づくスタッフ・管理者の情報を管理します
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id TEXT UNIQUE NOT NULL,       -- LINE側から送られてくるユーザー識別ID
  display_name TEXT NOT NULL,              -- 氏名またはLINE表示名
  role TEXT NOT NULL DEFAULT 'STAFF',      -- 'STAFF', 'MANAGER', 'ADMIN'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. シフトテーブル (shifts)
-- スタッフの予定（いつ・どこで働くか）を管理します
CREATE TABLE public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,                      -- 勤務日
  location TEXT NOT NULL,                  -- 勤務先（例: 京都ヨドバシカメラ）
  start_time TIME NOT NULL,                -- 予定開始時間 (例: 10:00:00)
  end_time TIME NOT NULL,                  -- 予定終了時間 (例: 19:00:00)
  status TEXT NOT NULL DEFAULT 'draft',    -- 'draft' or 'published'
  shift_type TEXT NOT NULL DEFAULT 'work', -- 'work' (通常出勤), 'task' (業務/タスク), 'interview' (面談)
  planned_wake_up_time TIME,               -- 予定起床時間
  planned_leave_time TIME,                 -- 予定出発時間
  daily_memo TEXT,                         -- スタッフ向け日次タスクメモ
  memo TEXT,                               -- 管理者からのメモ等
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. 打刻・勤怠実績テーブル (attendances)
-- LINEから送られてくる実際の「出勤」「退勤」の実績と位置情報を記録します
CREATE TABLE public.attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,                      -- 対象勤務日
  type TEXT NOT NULL,                      -- 打刻種類 ('WAKE_UP':起床, 'LEAVE':出発, 'CLOCK_IN':出勤, 'CLOCK_OUT':退勤)
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL, -- 打刻時間
  latitude DOUBLE PRECISION,               -- 緯度 (LINEから送信)
  longitude DOUBLE PRECISION,              -- 経度 (LINEから送信)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. 交通費精算テーブル (expenses)
-- スタッフが入力した交通費の明細を管理します
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  target_date DATE NOT NULL,               -- 利用日
  transport_type TEXT NOT NULL,            -- 交通機関 ('TRAIN', 'BUS', 'OTHER')
  departure TEXT NOT NULL,                 -- 出発（例: JR吹田）
  arrival TEXT NOT NULL,                   -- 到着（例: JR大阪）
  is_round_trip BOOLEAN DEFAULT true,      -- 往復かどうか
  amount INTEGER NOT NULL,                 -- 金額
  purpose TEXT,                            -- 目的・備考
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. 交通費テンプレート (自己登録マイルート) テーブル (expense_templates)
-- 各スタッフがよく使う経路を保存し、次回の入力時に楽にするためのマスタ
CREATE TABLE public.expense_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,             -- 例: 「A店舗 往復ルート」など
  transport_type TEXT NOT NULL,            -- 交通機関
  departure TEXT NOT NULL,                 -- 出発
  arrival TEXT NOT NULL,                   -- 到着
  is_round_trip BOOLEAN DEFAULT true,      -- 往復かどうか
  amount INTEGER NOT NULL,                 -- 固定金額
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) の設定
-- データベースに直接アクセスされても、他人のデータが見えないようにするセキュリティの壁
-- ==========================================

-- テーブルごとのRLSを有効化
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_templates ENABLE ROW LEVEL SECURITY;

-- 簡易的なポリシー（今回は仮で、全データに対して全権限を持たせます。本番運用時に厳格化します）
CREATE POLICY "Allow full access to users" ON public.users FOR ALL USING (true);
CREATE POLICY "Allow full access to shifts" ON public.shifts FOR ALL USING (true);
CREATE POLICY "Allow full access to attendances" ON public.attendances FOR ALL USING (true);
CREATE POLICY "Allow full access to expenses" ON public.expenses FOR ALL USING (true);
CREATE POLICY "Allow full access to expense_templates" ON public.expense_templates FOR ALL USING (true);

-- リアルタイム機能の有効化（LINEからの打刻を管理者が画面で即座に見れるようにするため）
ALTER PUBLICATION supabase_realtime ADD TABLE attendances;

-- ==========================================
-- Phase F 追加分: 店舗マスターとシフトの統合
-- ==========================================

-- 6. 店舗マスターテーブル (stores)
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,               -- 店舗名 (例: 京都ヨドバシカメラ)
  type TEXT NOT NULL DEFAULT 'store',      -- 'store'(物理店舗), 'role_group'(役職者等の擬似店舗)
  latitude DOUBLE PRECISION NOT NULL,      -- 緯度
  longitude DOUBLE PRECISION NOT NULL,     -- 経度
  radius_m INTEGER NOT NULL DEFAULT 500,   -- 許容打刻範囲(メートル)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to stores" ON public.stores FOR ALL USING (true);

-- 7. 希望休申請テーブル (holiday_requests)
CREATE TABLE public.holiday_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,                      -- 希望休の日付
  reason TEXT,                             -- 理由（任意）
  status TEXT NOT NULL DEFAULT 'PENDING',  -- 'PENDING', 'APPROVED', 'REJECTED'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.holiday_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to holiday_requests" ON public.holiday_requests FOR ALL USING (true);
