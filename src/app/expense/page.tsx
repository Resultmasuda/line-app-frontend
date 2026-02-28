"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Home, CalendarClock, Receipt, Settings, Plus, Train, Bus, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useLiff } from '@/components/LiffProvider';
import { getMonthlyExpenses, saveExpense, ExpenseRecord } from '@/lib/api/expense';

export default function ExpenseManagement() {
    const { user, loading: liffLoading } = useLiff();
    const [activeTab, setActiveTab] = useState('list'); // 'list' or 'new'

    const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // 新規入力用ステート
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [transport, setTransport] = useState('TRAIN');
    const [departure, setDeparture] = useState('');
    const [arrival, setArrival] = useState('');
    const [isRoundTrip, setIsRoundTrip] = useState(true);
    const [amount, setAmount] = useState('');
    const [purpose, setPurpose] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const fetchExpenses = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        const yearMonth = new Date().toISOString().substring(0, 7); // "YYYY-MM"
        const res = await getMonthlyExpenses(user.id, yearMonth);
        if (res.success && res.data) {
            setExpenses(res.data);
        }
        setIsLoading(false);
    }, [user]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchExpenses();
    }, [fetchExpenses]);

    const handleSave = async () => {
        if (!user || isSaving) return;
        if (!departure || !arrival || !amount) {
            alert("出発、到着、金額は必須です。");
            return;
        }

        setIsSaving(true);
        const numAmount = parseInt(amount, 10);

        const record: ExpenseRecord = {
            user_id: user.id,
            target_date: date,
            transport_type: transport,
            departure,
            arrival,
            is_round_trip: isRoundTrip,
            amount: isNaN(numAmount) ? 0 : numAmount,
            purpose
        };

        const res = await saveExpense(record);
        setIsSaving(false);

        if (res.success) {
            // 成功したら一覧に戻してリロード
            setDeparture('');
            setArrival('');
            setAmount('');
            setPurpose('');
            setActiveTab('list');
            fetchExpenses();
        } else {
            alert("保存に失敗しました。");
        }
    };

    const currentMonthStr = `${new Date().getFullYear()}年 ${new Date().getMonth() + 1}月`;
    const totalAmount = expenses.reduce((sum, item) => sum + item.amount, 0);

    if (liffLoading) {
        return <div className="flex h-screen items-center justify-center bg-gray-50 pb-20"><div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div></div>;
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50 pb-20 relative">
            {/* 画面ヘッダー */}
            <div className="bg-white px-5 pt-10 pb-0 shadow-sm z-10 sticky top-0">
                <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4">
                    <Receipt className="text-emerald-500" size={22} />
                    交通費精算
                </h1>

                {/* タブ切り替え */}
                <div className="flex border-b border-gray-100">
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === 'list' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-400'}`}
                    >
                        履歴・一覧
                    </button>
                    <button
                        onClick={() => setActiveTab('new')}
                        className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === 'new' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-400'}`}
                    >
                        新規入力
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 z-0">

                {activeTab === 'list' ? (
                    /* 履歴一覧タブ */
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* サマリーカード */}
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg shadow-emerald-200 mb-8">
                            <p className="text-emerald-100 text-sm font-medium mb-1">{currentMonthStr} 合計</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-black tracking-tight">¥{totalAmount.toLocaleString()}</span>
                            </div>
                            <div className="mt-4 flex justify-between items-center text-xs text-emerald-100 border-t border-emerald-400/30 pt-3">
                                <span>登録件数: {expenses.length}件</span>
                            </div>
                        </div>

                        <div className="flex justify-between items-end mb-4">
                            <h2 className="text-sm font-bold text-gray-700">今月の入力履歴</h2>
                        </div>

                        {/* 履歴リスト */}
                        {isLoading ? (
                            <div className="flex justify-center p-5"><div className="animate-spin w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full"></div></div>
                        ) : expenses.length === 0 ? (
                            <div className="text-center p-5 text-gray-400 text-sm">今月の登録データはありません</div>
                        ) : (
                            <div className="space-y-3">
                                {expenses.map((item) => {
                                    const itemDate = new Date(item.target_date);
                                    const dateStr = `${itemDate.getMonth() + 1}/${itemDate.getDate()}`;
                                    return (
                                        <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between active:scale-[0.98] transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                                                    {item.transport_type === 'TRAIN' ? <Train size={20} /> : <Bus size={20} />}
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-400 font-medium mb-0.5">{dateStr} • {item.is_round_trip ? '往復' : '片道'}</p>
                                                    <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                                                        {item.departure} <ChevronRight size={14} className="text-gray-300" /> {item.arrival}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right flex items-center h-full">
                                                <p className="font-bold text-gray-800 text-lg">¥{item.amount.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    /* 新規入力フォームタブ */
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">

                            <div className="space-y-5">
                                {/* 利用日 */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">利用日</label>
                                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-xl px-4 py-3 outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all font-medium" />
                                </div>

                                {/* 交通機関 */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">交通機関</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setTransport('TRAIN')}
                                            className={`${transport === 'TRAIN' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-gray-100 text-gray-400'} border-2 py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all`}
                                        >
                                            <Train size={18} /> 電車
                                        </button>
                                        <button
                                            onClick={() => setTransport('BUS')}
                                            className={`${transport === 'BUS' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-gray-100 text-gray-400'} border-2 py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all`}
                                        >
                                            <Bus size={18} /> バス
                                        </button>
                                    </div>
                                </div>

                                {/* 区間 */}
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 relative">
                                    <div className="absolute left-6 top-9 bottom-9 w-px bg-gray-300 border-dashed border-l"></div>

                                    <div className="flex items-center gap-3 relative z-10">
                                        <div className="w-4 h-4 rounded-full border-4 border-emerald-500 bg-white shadow-sm flex-shrink-0"></div>
                                        <input type="text" value={departure} onChange={(e) => setDeparture(e.target.value)} placeholder="出発 (例: JR吹田)" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 text-sm font-medium" />
                                    </div>

                                    <div className="flex items-center gap-3 relative z-10 mt-4">
                                        <div className="w-4 h-4 rounded-full border-4 border-rose-500 bg-white shadow-sm flex-shrink-0"></div>
                                        <input type="text" value={arrival} onChange={(e) => setArrival(e.target.value)} placeholder="到着 (例: JR大阪)" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 text-sm font-medium" />
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    {/* 片道復路 */}
                                    <div className="flex-[2]">
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">区分</label>
                                        <select
                                            value={isRoundTrip ? 'ROUND_TRIP' : 'ONE_WAY'}
                                            onChange={(e) => setIsRoundTrip(e.target.value === 'ROUND_TRIP')}
                                            className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 appearance-none font-medium"
                                        >
                                            <option value="ROUND_TRIP">往復</option>
                                            <option value="ONE_WAY">片道</option>
                                        </select>
                                    </div>

                                    {/* 金額 */}
                                    <div className="flex-[3]">
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">金額 (円)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">¥</span>
                                            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl pl-9 pr-4 py-3 outline-none focus:border-emerald-500 font-black text-lg" />
                                        </div>
                                    </div>
                                </div>

                                {/* 目的 */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">目的 / 備考</label>
                                    <input type="text" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="例: auヨドバシ 出勤のため" className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 text-sm" />
                                </div>
                            </div>

                            {/* 保存ボタン */}
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:opacity-70 text-white font-bold py-4 rounded-xl mt-8 shadow-lg shadow-emerald-200 transition-all flex justify-center items-center gap-2"
                            >
                                {isSaving ? (
                                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                                ) : (
                                    <><Plus size={20} /> 交通費を登録する</>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* フローティングボトムナビゲーション */}
            <div className="fixed bottom-0 w-full max-w-md bg-white/95 backdrop-blur-md border-t border-gray-100 px-6 pt-3 pb-8 flex justify-between items-center shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-50">
                <Link href="/" className="flex flex-col items-center text-gray-400 hover:text-emerald-500 transition-all active:scale-95">
                    <Home size={24} strokeWidth={2} />
                    <span className="text-[10px] mt-1.5 font-semibold">ホーム</span>
                </Link>
                <Link href="/shift" className="flex flex-col items-center text-gray-400 hover:text-emerald-500 transition-all active:scale-95">
                    <CalendarClock size={24} strokeWidth={2} />
                    <span className="text-[10px] mt-1.5 font-semibold">シフト</span>
                </Link>
                <Link href="/expense" className="flex flex-col items-center text-emerald-600 transition-transform active:scale-95">
                    <Receipt size={24} strokeWidth={2.5} />
                    <span className="text-[10px] mt-1.5 font-bold">交通費</span>
                </Link>
                <button className="flex flex-col items-center text-gray-400 hover:text-emerald-500 transition-all active:scale-95">
                    <Settings size={24} strokeWidth={2} />
                    <span className="text-[10px] mt-1.5 font-semibold">設定</span>
                </button>
            </div>
        </div>
    );
}
