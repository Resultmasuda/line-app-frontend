"use client";
import { Users, CalendarClock, Receipt, LayoutDashboard, Settings, LogOut, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { ReactNode } from 'react';
import LiffProvider, { useLiff } from '@/components/LiffProvider';
import { useRouter } from 'next/navigation';
import { getRoleDisplayLabel, isAdminUser } from '@/lib/utils/auth';

function AdminLayoutContent({ children }: { children: ReactNode }) {
    const { user, loading } = useLiff();
    const router = useRouter();

    if (loading) {
        return (
            <div className="flex h-screen bg-gray-50 items-center justify-center">
                <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin mb-4"></div>
                    <p className="text-emerald-600 font-bold text-sm">認証情報を確認中...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex h-screen bg-gray-50 items-center justify-center p-4">
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 text-center max-w-sm w-full animate-in zoom-in-95 duration-300">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                        <LayoutDashboard size={32} />
                    </div>
                    <h2 className="text-xl font-black text-gray-800 mb-2 tracking-tight">管理画面ログイン</h2>
                    <p className="text-sm text-gray-500 mb-8 leading-relaxed font-medium">
                        管理画面を利用するには、LINEアカウントでの認証が必要です。
                    </p>
                    <button
                        onClick={() => {
                            // LiffProviderの初期化を待たずに直接ログインをトリガー
                            import('@line/liff').then(liff => {
                                liff.default.login({ redirectUri: window.location.href });
                            });
                        }}
                        className="w-full py-4 bg-emerald-500 text-white rounded-xl font-black hover:bg-emerald-600 active:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
                    >
                        LINEでログイン
                    </button>
                </div>
            </div>
        );
    }

    const isAdmin = user && isAdminUser(user.role, user.id);
    if (!isAdmin) {
        return (
            <div className="flex h-screen bg-gray-50 items-center justify-center p-4">
                <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 text-center max-w-sm w-full animate-in zoom-in-95 duration-300">
                    <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                        <ShieldAlert size={32} />
                    </div>
                    <h2 className="text-xl font-black text-gray-800 mb-2 tracking-tight">アクセス権限がありません</h2>
                    <p className="text-sm text-gray-500 mb-8 leading-relaxed font-medium">
                        このページは管理者・役職者のみアクセス可能です。<br />
                        一般スタッフの方はスマートフォン版をご利用ください。
                    </p>
                    <button
                        onClick={() => router.push('/')}
                        className="w-full py-3.5 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 active:bg-emerald-700 transition-all shadow-md shadow-emerald-200"
                    >
                        スマホ版ホームに戻る
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50 font-sans">
            {/* 左側サイドバー (PC向け固定ナビゲーション) */}
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
                <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                        <span className="text-white font-black text-sm">MB</span>
                    </div>
                    <div>
                        <h1 className="font-bold text-gray-800 tracking-tight">管理ダッシュボード</h1>
                        <p className="text-[10px] text-gray-400 font-medium">Masuda Business App</p>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1">
                    <Link href="/admin/dashboard" className="flex items-center gap-3 px-3 py-2.5 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 rounded-lg font-bold text-sm transition-colors">
                        <LayoutDashboard size={18} />
                        概要サマリー
                    </Link>
                    <Link href="/admin/shifts" className="flex items-center gap-3 px-3 py-2.5 text-gray-600 hover:bg-gray-50 hover:text-emerald-700 rounded-lg font-semibold text-sm transition-colors">
                        <CalendarClock size={18} />
                        シフト・勤怠管理
                    </Link>
                    <Link href="/admin/expenses" className="flex items-center gap-3 px-3 py-2.5 text-gray-600 hover:bg-gray-50 hover:text-emerald-700 rounded-lg font-semibold text-sm transition-colors">
                        <Receipt size={18} />
                        交通費・経費管理
                    </Link>
                    <Link href="/admin/staff" className="flex items-center gap-3 px-3 py-2.5 text-gray-600 hover:bg-gray-50 hover:text-emerald-700 rounded-lg font-semibold text-sm transition-colors">
                        <Users size={18} />
                        スタッフ一覧
                    </Link>
                </nav>

                <div className="p-4 border-t border-gray-100 italic text-[10px] text-gray-300 text-center">
                    Masuda Business App v1.0
                </div>
            </aside>

            {/* モバイル用簡易ヘッダー */}
            <div className="md:hidden fixed top-0 w-full bg-white border-b border-gray-200 p-3 z-50 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-sm">
                        <span className="text-white font-black text-xs">MB</span>
                    </div>
                    <span className="font-bold text-gray-800 text-sm">管理画面</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-[10px] border-2 border-white shadow-sm overflow-hidden">
                    {user.display_name.substring(0, 2).toUpperCase()}
                </div>
            </div>

            {/* モバイル用ボトムナビゲーション */}
            <div className="md:hidden fixed bottom-0 w-full bg-white border-t border-gray-200 z-50 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
                <nav className="flex justify-around p-2">
                    <Link href="/admin/dashboard" className="flex flex-col items-center p-1.5 text-gray-500 hover:text-emerald-600 active:text-emerald-700 transition-colors">
                        <LayoutDashboard size={20} />
                        <span className="text-[10px] mt-1 font-bold">トップ</span>
                    </Link>
                    <Link href="/admin/shifts" className="flex flex-col items-center p-1.5 text-gray-500 hover:text-emerald-600 active:text-emerald-700 transition-colors">
                        <CalendarClock size={20} />
                        <span className="text-[10px] mt-1 font-bold">シフト</span>
                    </Link>
                    <Link href="/admin/expenses" className="flex flex-col items-center p-1.5 text-gray-500 hover:text-emerald-600 active:text-emerald-700 transition-colors">
                        <Receipt size={20} />
                        <span className="text-[10px] mt-1 font-bold">交通費</span>
                    </Link>
                    <Link href="/admin/staff" className="flex flex-col items-center p-1.5 text-gray-500 hover:text-emerald-600 active:text-emerald-700 transition-colors">
                        <Users size={20} />
                        <span className="text-[10px] mt-1 font-bold">スタッフ</span>
                    </Link>
                </nav>
            </div>

            {/* メインコンテンツエリア */}
            <main className="flex-1 flex flex-col md:pt-0 pt-16 pb-20 md:pb-0 overflow-hidden">
                <header className="bg-white border-b border-gray-200 py-4 px-8 flex justify-between items-center hidden md:flex">
                    <h2 className="text-lg font-bold text-gray-700">ダッシュボード</h2>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-sm font-bold text-gray-800">{user.display_name} 殿</p>
                            <p className="text-xs text-emerald-600 font-semibold mt-0.5">
                                {getRoleDisplayLabel(user.role, user.id)}
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 font-bold border-2 border-white shadow-sm flex items-center justify-center text-sm">
                            {user.display_name.substring(0, 2).toUpperCase()}
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-auto bg-gray-50/50 p-4 md:p-8">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
    return (
        <LiffProvider>
            <AdminLayoutContent>
                {children}
            </AdminLayoutContent>
        </LiffProvider>
    );
}
