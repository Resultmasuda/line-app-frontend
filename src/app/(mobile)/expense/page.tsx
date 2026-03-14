"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Home, CalendarClock, Receipt, Settings, Plus, Train, Bus, Hotel, ChevronRight, Bookmark, Pencil, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useLiff } from '@/components/LiffProvider';
import { getMonthlyExpenses, saveExpense, updateExpense, deleteExpense, ExpenseRecord, ExpenseTemplateRecord, getExpenseTemplates, saveExpenseTemplate, deleteExpenseTemplate } from '@/lib/api/expense';

export default function ExpenseManagement() {
    const { user, loading: liffLoading } = useLiff();
    const [activeTab, setActiveTab] = useState('list'); // 'list' or 'new'

    const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [templates, setTemplates] = useState<ExpenseTemplateRecord[]>([]);
    const [isSaveTemplate, setIsSaveTemplate] = useState(false);
    const [templateName, setTemplateName] = useState('');

    const [date, setDate] = useState(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });
    const [transport, setTransport] = useState<any>('TRAIN');
    const [departure, setDeparture] = useState('');
    const [arrival, setArrival] = useState('');
    const [isRoundTrip, setIsRoundTrip] = useState(true);
    const [amount, setAmount] = useState('');
    const [purpose, setPurpose] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // 編集モード用State
    const [editId, setEditId] = useState<string | null>(null);

    // 確認モーダル用State
    const [showConfirm, setShowConfirm] = useState(false);
    const [pendingConfirm, setPendingConfirm] = useState<{ message: string, action: () => void } | null>(null);

    const fetchExpenses = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const yearMonth = `${year}-${month}`; // Local timezone "YYYY-MM"
        const res = await getMonthlyExpenses(user.id, yearMonth);
        if (res.success && res.data) {
            setExpenses(res.data);
        }
        const tRes = await getExpenseTemplates(user.id);
        if (tRes.success && tRes.data) {
            setTemplates(tRes.data);
        }
        setIsLoading(false);
    }, [user]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchExpenses();
    }, [fetchExpenses]);

    const handleEdit = (item: ExpenseRecord) => {
        setDate(item.target_date);
        setTransport(item.transport_type);
        setDeparture(item.departure);
        setArrival(item.arrival);
        setIsRoundTrip(item.is_round_trip);
        setAmount(item.amount.toString());
        setPurpose(item.purpose || '');
        setEditId(item.id || null);
        setActiveTab('new');
    };

    const handleDelete = async (id: string | undefined) => {
        if (!id || !user) return;
        setPendingConfirm({
            message: 'この交通費データを削除してもよろしいですか？',
            action: async () => {
                setIsLoading(true);
                const res = await deleteExpense(id);
                if (res.success) {
                    fetchExpenses();
                } else {
                    alert('削除に失敗しました。');
                    setIsLoading(false);
                }
            }
        });
    };

    const handleDeleteTemplate = async (id: string | undefined) => {
        if (!id || !user) return;
        setPendingConfirm({
            message: 'このよく使う経路を削除してもよろしいですか？',
            action: async () => {
                const res = await deleteExpenseTemplate(id);
                if (res.success) {
                    setTemplates(templates.filter(t => t.id !== id));
                } else {
                    alert('経路の削除に失敗しました。');
                }
            }
        });
    };

    const handleSave = async () => {
        if (!user || isSaving) return;

        // 宿泊の場合は到着地は必須ではない
        const isHotel = transport === 'HOTEL';
        if (!departure || (!isHotel && !arrival) || !amount) {
            alert("出発（宿泊先）、到着、金額は必須です。");
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

        let res;
        if (editId) {
            res = await updateExpense(editId, record);
        } else {
            res = await saveExpense(record);
        }

        if (res.success && !editId && isSaveTemplate) {
            const tName = templateName.trim() || `${departure}〜${arrival}`;
            await saveExpenseTemplate({
                user_id: user.id,
                template_name: tName,
                transport_type: transport,
                departure: departure,
                arrival: arrival,
                is_round_trip: isRoundTrip,
                amount: isNaN(numAmount) ? 0 : numAmount
            });
        }

        setIsSaving(false);

        if (res.success) {
            // 成功したら一覧に戻してリロード
            setDeparture('');
            setArrival('');
            setAmount('');
            setPurpose('');
            setIsSaveTemplate(false);
            setTemplateName('');
            setEditId(null);
            setShowConfirm(false); // 保存完了後にモーダルを閉じる
            setActiveTab('list');
            fetchExpenses();
        } else {
            alert("保存に失敗しました。");
        }
    };

    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}年 ${now.getMonth() + 1}月`;
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
                        onClick={() => {
                            setActiveTab('list');
                            setEditId(null);
                        }}
                        className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === 'list' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-400'}`}
                    >
                        履歴・一覧
                    </button>
                    <button
                        onClick={() => setActiveTab('new')}
                        className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === 'new' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-400'}`}
                    >
                        {editId ? 'データ編集' : '新規入力'}
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
                                        <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 active:scale-[0.98] transition-all">
                                            <div className="flex items-center justify-between mb-3 border-b border-gray-50 pb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                                                        {item.transport_type === 'TRAIN' ? <Train size={20} /> : item.transport_type === 'HOTEL' ? <Hotel size={20} /> : (item.transport_type === 'COMMUTER_PASS' || item.transport_type === 'COMMUTER_USE') ? <Bookmark size={20} /> : <Bus size={20} />}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-400 font-medium mb-0.5">{dateStr} • {item.transport_type === 'HOTEL' ? '宿泊' : item.is_round_trip ? '往復' : '片道'}</p>
                                                        <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                                                            {item.departure} {item.transport_type !== 'HOTEL' && <><ChevronRight size={14} className="text-gray-300" /> {item.arrival}</>}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right flex flex-col items-end h-full justify-center">
                                                    <p className="font-bold text-gray-800 text-lg">¥{item.amount.toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleEdit(item)} className="px-3 py-1.5 bg-blue-50 text-blue-600 font-bold rounded-lg text-xs flex items-center gap-1 hover:bg-blue-100 transition-colors">
                                                    <Pencil size={12} /> 編集
                                                </button>
                                                <button onClick={() => handleDelete(item.id)} className="px-3 py-1.5 bg-rose-50 text-rose-600 font-bold rounded-lg text-xs flex items-center gap-1 hover:bg-rose-100 transition-colors">
                                                    <Trash2 size={12} /> 削除
                                                </button>
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
                        {templates.length > 0 && !editId && (
                            <div className="mb-5">
                                <label className="block text-xs font-bold text-gray-500 mb-2 ml-1">よく使う経路を呼び出す</label>
                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none w-full">
                                    {templates.map((t) => (
                                        <div key={t.id} className="relative flex-shrink-0 flex group">
                                            <button
                                                onClick={() => {
                                                    setTransport(t.transport_type);
                                                    setDeparture(t.departure);
                                                    setArrival(t.arrival);
                                                    setIsRoundTrip(t.is_round_trip);
                                                    setAmount(t.amount.toString());
                                                }}
                                                className="whitespace-nowrap bg-white border border-emerald-100 text-emerald-700 font-bold text-xs py-2 pl-3 pr-8 rounded-lg shadow-sm active:bg-emerald-50 transition-colors flex items-center gap-1.5"
                                            >
                                                <Bookmark size={14} />
                                                {t.template_name}
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteTemplate(t.id);
                                                }}
                                                className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-red-500 rounded-full transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">

                            <div className="space-y-5">
                                {/* 利用日 */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">利用日</label>
                                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-xl px-4 py-3 outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all font-medium" />
                                </div>

                                {/* 交通機関 */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">交通機関・種別</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        <button
                                            onClick={() => setTransport('TRAIN')}
                                            className={`${transport === 'TRAIN' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-gray-100 text-gray-400'} border-2 py-3 rounded-xl flex flex-col items-center justify-center gap-1 font-bold transition-all text-sm`}
                                        >
                                            <Train size={18} /> 電車
                                        </button>
                                        <button
                                            onClick={() => setTransport('BUS')}
                                            className={`${transport === 'BUS' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-gray-100 text-gray-400'} border-2 py-3 rounded-xl flex flex-col items-center justify-center gap-1 font-bold transition-all text-sm`}
                                        >
                                            <Bus size={18} /> バス
                                        </button>
                                        <button
                                            onClick={() => {
                                                setTransport('COMMUTER_PASS');
                                                setIsRoundTrip(false);
                                            }}
                                            className={`${transport === 'COMMUTER_PASS' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-gray-100 text-gray-400'} border-2 py-3 rounded-xl flex flex-col items-center justify-center gap-1 font-bold transition-all text-sm`}
                                        >
                                            <Bookmark size={18} /> 定期券
                                        </button>
                                        <button
                                            onClick={() => {
                                                setTransport('HOTEL');
                                                setIsRoundTrip(false);
                                                setArrival('');
                                            }}
                                            className={`${transport === 'HOTEL' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-gray-100 text-gray-400'} border-2 py-3 rounded-xl flex flex-col items-center justify-center gap-1 font-bold transition-all text-sm`}
                                        >
                                            <Hotel size={18} /> 宿泊
                                        </button>
                                    </div>
                                </div>

                                {/* 定期利用の個別切り替え (電車・バスの時のみ) */}
                                {(transport === 'TRAIN' || transport === 'BUS') && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                const currentType = transport as string;
                                                setTransport((currentType === 'COMMUTER_USE' ? 'TRAIN' : 'COMMUTER_USE') as any);
                                                if (currentType !== 'COMMUTER_USE') {
                                                    setAmount('0');
                                                    setPurpose('定期利用');
                                                }
                                            }}
                                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${transport === 'COMMUTER_USE' ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-emerald-100 text-emerald-600'}`}
                                        >
                                            {transport === 'COMMUTER_USE' ? '✓ 定期利用中' : 'この移動を「定期利用」にする'}
                                        </button>
                                    </div>
                                )}

                                {/* 区間 (宿泊時は名称・備考等に変更) */}
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 relative">
                                    {(transport !== 'HOTEL' && transport !== 'COMMUTER_PASS') && <div className="absolute left-6 top-9 bottom-9 w-px bg-gray-300 border-dashed border-l"></div>}

                                    <div className="flex items-center gap-3 relative z-10">
                                        <div className="w-4 h-4 rounded-full border-4 border-emerald-500 bg-white shadow-sm flex-shrink-0"></div>
                                        <input type="text" value={departure} onChange={(e) => setDeparture(e.target.value)} placeholder={transport === 'HOTEL' ? "宿泊先 (例: アパホテル)" : transport === 'COMMUTER_PASS' ? "定期区間 (例: 吹田〜大阪)" : "出発 (例: JR吹田)"} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 text-sm font-medium" />
                                    </div>

                                    {(transport !== 'HOTEL' && transport !== 'COMMUTER_PASS') && (
                                        <div className="flex items-center gap-3 relative z-10 mt-4">
                                            <div className="w-4 h-4 rounded-full border-4 border-rose-500 bg-white shadow-sm flex-shrink-0"></div>
                                            <input type="text" value={arrival} onChange={(e) => setArrival(e.target.value)} placeholder="到着 (例: JR大阪)" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 text-sm font-medium" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-4">
                                    {/* 片道復路 / 宿泊日数 / 定期期間 */}
                                    {transport === 'HOTEL' ? (
                                        <div className="flex-[2]">
                                            <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">宿泊日数</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={arrival.replace('泊', '')}
                                                    onChange={(e) => setArrival(e.target.value ? `${e.target.value}泊` : '')}
                                                    placeholder="1"
                                                    min="1"
                                                    className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 font-medium text-center"
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm pointer-events-none">泊</span>
                                            </div>
                                        </div>
                                    ) : transport === 'COMMUTER_PASS' ? (
                                        <div className="flex-[3]">
                                            <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">定期有効期限 (終了日)</label>
                                            <input type="date" value={arrival} onChange={(e) => setArrival(e.target.value)} className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 font-medium text-sm" />
                                        </div>
                                    ) : (
                                        <div className="flex-[2]">
                                            <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">区分</label>
                                            <select
                                                value={isRoundTrip ? 'ROUND_TRIP' : 'ONE_WAY'}
                                                onChange={(e) => setIsRoundTrip(e.target.value === 'ROUND_TRIP')}
                                                disabled={transport === 'COMMUTER_USE'}
                                                className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 appearance-none font-medium disabled:opacity-50"
                                            >
                                                <option value="ROUND_TRIP">往復</option>
                                                <option value="ONE_WAY">片道</option>
                                            </select>
                                        </div>
                                    )}

                                    {/* 金額 */}
                                    <div className="flex-[3]">
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">金額 (円)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">¥</span>
                                            <input
                                                type="number"
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                disabled={transport === 'COMMUTER_USE'}
                                                placeholder="0"
                                                className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl pl-9 pr-4 py-3 outline-none focus:border-emerald-500 font-black text-lg disabled:opacity-75"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* 目的 */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5 ml-1">目的 / 備考</label>
                                    <input
                                        type="text"
                                        value={purpose}
                                        onChange={(e) => setPurpose(e.target.value)}
                                        placeholder={transport === 'COMMUTER_PASS' ? "例: JR線・阪急線" : "例: 店舗出勤のため"}
                                        className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 text-sm"
                                    />
                                </div>
                            </div>

                            {/* テンプレート登録オプション (新規時のみ) */}
                            {!editId && (
                                <div className="mt-6 pt-5 border-t border-gray-100">
                                    <label className="flex items-center gap-2 cursor-pointer mb-3">
                                        <input
                                            type="checkbox"
                                            checked={isSaveTemplate}
                                            onChange={(e) => setIsSaveTemplate(e.target.checked)}
                                            className="w-5 h-5 rounded text-emerald-500 focus:ring-emerald-500 border-gray-300 accent-emerald-500"
                                        />
                                        <span className="text-sm font-bold text-gray-700">次回から使えるよう経路を保存する</span>
                                    </label>
                                    {isSaveTemplate && (
                                        <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                            <input
                                                type="text"
                                                value={templateName}
                                                onChange={(e) => setTemplateName(e.target.value)}
                                                placeholder="ルート名 (例: 梅田ルート)"
                                                className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-xl px-4 py-3 outline-none focus:bg-white focus:border-emerald-500 text-sm font-bold"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 保存ボタン (確認モーダルを開く) */}
                            <button
                                onClick={() => setShowConfirm(true)}
                                disabled={isSaving || !amount || !departure || (transport !== 'HOTEL' && !arrival)}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:opacity-70 text-white font-bold py-4 rounded-xl mt-8 shadow-lg shadow-emerald-200 transition-all flex justify-center items-center gap-2"
                            >
                                <Plus size={20} /> 入力内容を確認する
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* --- カスタム確認（削除等）モーダル --- */}
            {pendingConfirm && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center border-b border-gray-100">
                            <h3 className="font-bold text-lg text-gray-800">確認</h3>
                            <p className="text-sm text-gray-600 mt-2 font-medium">{pendingConfirm.message}</p>
                        </div>
                        <div className="p-4 flex gap-3 bg-white">
                            <button
                                onClick={() => setPendingConfirm(null)}
                                className="flex-1 py-3.5 bg-gray-100 text-gray-500 font-bold rounded-xl active:bg-gray-200 transition-colors"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={() => {
                                    pendingConfirm.action();
                                    setPendingConfirm(null);
                                }}
                                className="flex-1 py-3.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl active:bg-rose-700 transition-all shadow-md shadow-rose-200"
                            >
                                実行する
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- 確認モーダル (登録前セルフチェック) --- */}
            {showConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center border-b border-gray-100">
                            <h3 className="font-bold text-lg text-gray-800">{editId ? '以下の内容で更新しますか？' : '以下の内容で登録しますか？'}</h3>
                            <p className="text-xs text-rose-500 mt-1 font-bold">※間違いがないか必ずご確認ください</p>
                        </div>

                        <div className="p-6 bg-gray-50/50 space-y-4">
                            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                <span className="text-xs font-bold text-gray-400">利用日</span>
                                <span className="text-sm font-bold text-gray-800">{new Date(date).toLocaleDateString('ja-JP')}</span>
                            </div>

                            <div>
                                <span className="text-xs font-bold text-gray-400 block mb-1">{transport === 'HOTEL' ? '宿泊箇所等' : '区間'}</span>
                                <div className="bg-white border border-gray-100 rounded-lg p-3 flex items-center justify-center gap-2 shadow-sm">
                                    <span className="font-bold text-gray-800 text-sm truncate max-w-[40%]">{departure}</span>
                                    {transport !== 'HOTEL' && (
                                        <>
                                            <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
                                            <span className="font-bold text-gray-800 text-sm truncate max-w-[40%]">{arrival}</span>
                                        </>
                                    )}
                                </div>
                            </div>

                             <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                <span className="text-xs font-bold text-gray-400">種別</span>
                                <span className="text-sm font-bold text-gray-800 flex items-center gap-1">
                                    {transport === 'TRAIN' ? <Train size={14} /> : transport === 'HOTEL' ? <Hotel size={14} /> : transport === 'COMMUTER_PASS' ? <Bookmark size={14} /> : <Bus size={14} />}
                                    {transport === 'TRAIN' ? '電車' : transport === 'HOTEL' ? '宿泊' : transport === 'COMMUTER_PASS' ? '定期券購入' : transport === 'COMMUTER_USE' ? '定期利用(0円)' : 'バス'}
                                </span>
                            </div>

                            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                <span className="text-xs font-bold text-gray-400">区分</span>
                                <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                                    {transport === 'HOTEL' ? '宿泊' : transport === 'COMMUTER_PASS' ? '定期券' : transport === 'COMMUTER_USE' ? '定期利用' : isRoundTrip ? '往復' : '片道'}
                                </span>
                            </div>

                            <div className="flex justify-between items-end pt-2">
                                <span className="text-xs font-bold text-gray-400 mb-1">精算金額</span>
                                <span className="text-2xl font-black text-gray-900 tracking-tight">
                                    ¥{parseInt(amount).toLocaleString() || 0}
                                </span>
                            </div>
                        </div>

                        <div className="p-4 flex gap-3 bg-white">
                            <button
                                onClick={() => setShowConfirm(false)}
                                disabled={isSaving}
                                className="flex-1 py-3.5 bg-gray-100 text-gray-500 font-bold rounded-xl active:bg-gray-200 transition-colors"
                            >
                                NO (戻る)
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl active:bg-emerald-700 transition-all flex justify-center items-center shadow-md shadow-emerald-200"
                            >
                                {isSaving ? (
                                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                                ) : (
                                    editId ? 'YES (上書き更新)' : 'YES (登録)'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* フローティングボトムナビゲーション */}
            <div className="fixed bottom-0 w-full max-w-md bg-white/95 backdrop-blur-md border-t border-gray-100 px-6 pt-3 pb-8 flex justify-around items-center shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-50">
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
            </div>
        </div>
    );
}
