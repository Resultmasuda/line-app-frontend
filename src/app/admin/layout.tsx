"use client";
import { Users, CalendarClock, Receipt, LayoutDashboard, Settings, LogOut, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { ReactNode } from 'react';
import LiffProvider, { useLiff } from '@/components/LiffProvider';
import { useRouter, usePathname } from 'next/navigation';
import { getRoleDisplayLabel, isAdminUser } from '@/lib/utils/auth';

function AdminLayoutContent({ children }: { children: ReactNode }) {
    const { user, loading } = useLiff();
    const router = useRouter();
    const pathname = usePathname();

    if (loading) {
        return (
            <div className="flex h-screen bg-gray-50 items-center justify-center">
                <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full border-4 border-brand-blue border-t-transparent animate-spin mb-4"></div>
                    <p className="text-brand-blue font-black text-sm">認証情報を確認中...</p>
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
                            import('@line/liff').then(liff => {
                                liff.default.login({ redirectUri: window.location.href });
                            });
                        }}
                        className="w-full py-4 bg-brand-blue text-white rounded-xl font-black hover:bg-brand-deep-blue active:scale-95 transition-all shadow-lg shadow-brand-blue/20 flex items-center justify-center gap-2"
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
                        一般スタッフの方は利用者ホームをご利用ください。
                    </p>
                    <button
                        onClick={() => router.push('/')}
                        className="w-full py-3.5 bg-brand-blue text-white rounded-xl font-black hover:bg-brand-deep-blue active:scale-95 transition-all shadow-lg shadow-brand-blue/20"
                    >
                        ホームに戻る
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50 font-sans">
            {/* 左側サイドバー (PC向け固定ナビゲーション) */}
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
                <div className="p-6 border-b border-gray-100 flex items-center gap-3 bg-slate-50/50">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center overflow-hidden shadow-sm border border-brand-blue/10">
                        <img src="/images/company_logo.png" alt="Logo" className="w-full h-full object-contain p-1.5" />
                    </div>
                    <div>
                        <h1 className="font-black text-gray-800 tracking-tighter text-lg leading-none">RESULT <span className="text-brand-blue">ADMIN</span></h1>
                        <p className="text-[9px] text-brand-sky font-black tracking-[0.2em] uppercase mt-1">Management System</p>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-8 space-y-2 relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
                    <Link href="/admin/dashboard" className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-black text-sm transition-all group border ${pathname === '/admin/dashboard' ? 'bg-brand-blue/10 text-brand-blue border-brand-blue/10' : 'text-slate-500 hover:bg-slate-50 hover:text-brand-blue border-transparent'}`}>
                        <LayoutDashboard size={18} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform" />
                        概要サマリー
                    </Link>
                    <Link href="/admin/shifts" className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-black text-sm transition-all group border ${pathname === '/admin/shifts' ? 'bg-brand-blue/10 text-brand-blue border-brand-blue/10' : 'text-slate-500 hover:bg-slate-50 hover:text-brand-blue border-transparent'}`}>
                        <CalendarClock size={18} strokeWidth={2.5} className="group-hover:scale-110 group-hover:text-brand-blue transition-all" />
                        シフト・勤怠管理
                    </Link>
                    <Link href="/admin/expenses" className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-black text-sm transition-all group border ${pathname === '/admin/expenses' ? 'bg-brand-blue/10 text-brand-blue border-brand-blue/10' : 'text-slate-500 hover:bg-slate-50 hover:text-brand-blue border-transparent'}`}>
                        <Receipt size={18} strokeWidth={2.5} className="group-hover:scale-110 group-hover:text-brand-blue transition-all" />
                        交通費・経費管理
                    </Link>
                    <Link href="/admin/staff" className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-black text-sm transition-all group border ${pathname.includes('/admin/staff') ? 'bg-brand-blue/10 text-brand-blue border-brand-blue/10' : 'text-slate-500 hover:bg-slate-50 hover:text-brand-blue border-transparent'}`}>
                        <Users size={18} strokeWidth={2.5} className="group-hover:scale-110 group-hover:text-brand-blue transition-all" />
                        スタッフ一覧
                    </Link>
                </nav>

                <div className="p-4 border-t border-gray-100 italic text-[10px] text-gray-300 text-center">
                    業務管理ポータル v1.0
                </div>
            </aside>

            {/* モバイル用簡易ヘッダー */}
            <div className="md:hidden fixed top-0 w-full bg-white border-b border-gray-200 p-3 z-50 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm border border-gray-50 overflow-hidden">
                        <img src="/images/company_logo.png" alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <span className="font-bold text-gray-800 text-sm">管理ポータル</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-[10px] border-2 border-white shadow-sm overflow-hidden">
                    {user.display_name.substring(0, 2).toUpperCase()}
                </div>
            </div>

            {/* モバイル用ボトムナビゲーション */}
            <div className="md:hidden fixed bottom-0 w-full bg-white border-t border-gray-200 z-50 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
                <nav className="flex justify-around p-2">
                    <Link href="/admin/dashboard" className={`flex flex-col items-center p-1.5 transition-colors ${pathname.includes('dashboard') ? 'text-brand-blue' : 'text-gray-400'}`}>
                        <LayoutDashboard size={20} />
                        <span className="text-[10px] mt-1 font-black uppercase tracking-tighter">トップ</span>
                    </Link>
                    <Link href="/admin/shifts" className={`flex flex-col items-center p-1.5 transition-colors ${pathname.includes('shifts') ? 'text-brand-blue' : 'text-gray-400'}`}>
                        <CalendarClock size={20} />
                        <span className="text-[10px] mt-1 font-black uppercase tracking-tighter">シフト</span>
                    </Link>
                    <Link href="/admin/expenses" className={`flex flex-col items-center p-1.5 transition-colors ${pathname.includes('expenses') ? 'text-brand-blue' : 'text-gray-400'}`}>
                        <Receipt size={20} />
                        <span className="text-[10px] mt-1 font-black uppercase tracking-tighter">交通費</span>
                    </Link>
                    <Link href="/admin/staff" className={`flex flex-col items-center p-1.5 transition-colors ${pathname.includes('staff') ? 'text-brand-blue' : 'text-gray-400'}`}>
                        <Users size={20} />
                        <span className="text-[10px] mt-1 font-black uppercase tracking-tighter">スタッフ</span>
                    </Link>
                </nav>
            </div>

            {/* メインコンテンツエリア */}
            <main className="flex-1 flex flex-col md:pt-0 pt-16 pb-20 md:pb-0 overflow-hidden">
                <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 py-4 px-10 flex justify-between items-center hidden md:flex sticky top-0 z-40">
                    <div className="flex items-center gap-4">
                        <div className="h-8 w-1 bg-brand-blue rounded-full"></div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tighter uppercase">
                            {pathname === '/admin/dashboard' && <>DASHBOARD <span className="text-slate-300 font-thin mx-2">/</span> <span className="text-brand-blue text-sm tracking-[0.2em]">概要サマリー</span></>}
                            {pathname === '/admin/shifts' && <>SHIFTS <span className="text-slate-300 font-thin mx-2">/</span> <span className="text-brand-blue text-sm tracking-[0.2em]">シフト・勤怠管理</span></>}
                            {pathname === '/admin/expenses' && <>EXPENSES <span className="text-slate-300 font-thin mx-2">/</span> <span className="text-brand-blue text-sm tracking-[0.2em]">交通費・経費管理</span></>}
                            {pathname.includes('/admin/staff') && <>STAFF <span className="text-slate-300 font-thin mx-2">/</span> <span className="text-brand-blue text-sm tracking-[0.2em]">スタッフ一覧</span></>}
                        </h2>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <p className="text-[10px] font-black text-brand-sky tracking-widest uppercase mb-0.5">{getRoleDisplayLabel(user.role, user.id)}</p>
                            <p className="text-sm font-black text-slate-800">
                                {user.display_name}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-sky text-white font-black border-4 border-white shadow-xl flex items-center justify-center text-sm transform hover:rotate-6 transition-transform overflow-hidden relative group">
                            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
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
