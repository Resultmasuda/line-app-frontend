import { Users, CalendarClock, Receipt, LayoutDashboard, Settings, LogOut } from 'lucide-react';
import Link from 'next/link';
import { ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
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

                <div className="p-4 border-t border-gray-100">
                    <button className="flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-gray-700 w-full rounded-lg font-semibold text-sm transition-colors">
                        <Settings size={18} />
                        システム設定
                    </button>
                    <button className="flex items-center gap-3 px-3 py-2 text-rose-400 hover:text-rose-600 w-full rounded-lg font-semibold text-sm transition-colors mt-1">
                        <LogOut size={18} />
                        ログアウト
                    </button>
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
                <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white shadow-sm overflow-hidden">
                    <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Admin&backgroundColor=e2e8f0" alt="Admin" />
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
                            <p className="text-sm font-bold text-gray-800">管理者 殿</p>
                            <p className="text-xs text-emerald-600 font-semibold">Store Manager</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white shadow-sm overflow-hidden">
                            <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Admin&backgroundColor=e2e8f0" alt="Admin" />
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
