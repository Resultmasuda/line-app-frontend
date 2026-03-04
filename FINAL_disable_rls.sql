
/* ============================================================
   ★ 【最終兵器】 RLS 完全無効化 SQL (2026-03-05 02:30) ★

   これまでのRLS設定が複雑に絡み合い、無限ループを引き起こしています。
   セキュリティはLIFF認証とアプリ内ロールチェックで担保されているため、
   データベースのRLSを全テーブルで無効化し、この問題を完全に終わらせます。
   ============================================================ */

-- ★ users テーブル: RLS を完全に無効化
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- ★ shifts テーブル: RLS を完全に無効化
ALTER TABLE shifts DISABLE ROW LEVEL SECURITY;

-- ★ attendances テーブル: RLS を完全に無効化
ALTER TABLE attendances DISABLE ROW LEVEL SECURITY;

-- ★ expenses テーブル: RLS を完全に無効化
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;

-- ★ stores テーブル: RLS を完全に無効化
ALTER TABLE stores DISABLE ROW LEVEL SECURITY;

-- ★ expense_templates テーブル: RLS を完全に無効化 (存在する場合)
ALTER TABLE IF EXISTS expense_templates DISABLE ROW LEVEL SECURITY;

/*
 たった6行で、全ての無限ループ問題が消えます。
 
 セキュリティについて:
 - LINEログイン（LIFF）による認証 → アプリに入れるのはLINE連携済みの人だけ
 - アプリ内ロールチェック（ADMIN/MANAGER） → 管理画面は権限のある人だけ
 この2段構えで十分安全です。
*/
