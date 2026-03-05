"use client";
import React, { useState, useEffect } from 'react';
import { Receipt, Search, Filter, Download, ArrowDownToLine, ChevronLeft, ChevronRight, Train, Bus, Hotel, ChevronDown, ChevronUp } from 'lucide-react';
import { getAllExpenses } from '@/lib/api/admin';

type ExpenseRecord = {
    id: string;
    target_date: string;
    transport_type: string;
    departure: string;
    arrival: string;
    is_round_trip: boolean;
    amount: number;
    purpose?: string;
    users?: { display_name: string };
};

export default function AdminExpensesPage() {
    const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // 現在の表示月 (デフォルトは今月)
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        async function fetchExpenses() {
            setIsLoading(true);
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const res = await getAllExpenses(`${year}-${month}`);
            if (res.success && res.data) {
                setExpenses(res.data);
            } else {
                setExpenses([]);
            }
            setIsLoading(false);
        }
        fetchExpenses();
    }, [currentDate]);

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const filteredExpenses = expenses.filter(exp =>
        exp.users?.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.departure.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.arrival.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    // ユーザーごとにグループ化
    const groupedExpenses = filteredExpenses.reduce((acc, exp) => {
        const userName = exp.users?.display_name || '不明';
        if (!acc[userName]) acc[userName] = [];
        acc[userName].push(exp);
        return acc;
    }, {} as Record<string, ExpenseRecord[]>);

    const userNames = Object.keys(groupedExpenses).sort();

    // アコーディオンの開閉状態
    const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});

    const toggleUser = (userName: string) => {
        setExpandedUsers(prev => ({
            ...prev,
            [userName]: !prev[userName]
        }));
    };

    const handleCsvExport = () => {
        if (filteredExpenses.length === 0) return;

        const headers = ['申請者', '利用日', '種別', '区分', '区間/宿泊先', '到着', '目的/備考', '金額'];
        const rows = filteredExpenses.map(exp => [
            exp.users?.display_name || '不明',
            exp.target_date,
            exp.transport_type === 'TRAIN' ? '電車' : exp.transport_type === 'HOTEL' ? '宿泊' : 'バス',
            exp.transport_type === 'HOTEL' ? '宿泊' : exp.is_round_trip ? '往復' : '片道',
            exp.departure,
            exp.arrival || '',
            exp.purpose || '',
            exp.amount.toString()
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(e => e.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `expenses_${currentDate.getFullYear()}_${String(currentDate.getMonth() + 1).padStart(2, '0')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center max-w-6xl">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Receipt className="text-emerald-500" size={28} />
                        交通費・経費管理
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        スタッフから申請された全経費の確認と集計
                    </p>
                </div>

                <div className="flex items-center gap-4 bg-white px-4 py-2 border border-gray-200 rounded-xl shadow-sm">
                    <button onClick={handlePrevMonth} className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <span className="font-bold text-gray-800 min-w-[100px] text-center">
                        {currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月
                    </span>
                    <button onClick={handleNextMonth} className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold text-gray-500 mb-1">当月 申請合計額</p>
                        <p className="text-3xl font-black text-gray-800 tracking-tight">¥{totalAmount.toLocaleString()}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                        <Receipt size={24} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold text-gray-500 mb-1">当月 申請件数</p>
                        <p className="text-3xl font-black text-gray-800 tracking-tight">{filteredExpenses.length} 件</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
                        <ArrowDownToLine size={24} />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-w-6xl">
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center bg-gray-50/50 gap-4">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="スタッフ名・駅名で検索..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                        />
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button className="flex-1 md:flex-none justify-center flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors bg-white">
                            <Filter size={16} />
                            絞り込み
                        </button>
                        <button onClick={handleCsvExport} className="flex-1 md:flex-none justify-center flex items-center gap-2 px-3 py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold hover:bg-emerald-600 transition-colors shadow-sm">
                            <Download size={16} />
                            CSV出力
                        </button>
                    </div>
                </div>

                <div className="p-4">
                    {isLoading ? (
                        <div className="py-12 text-center text-gray-400">
                            <div className="flex justify-center mb-2">
                                <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
                            </div>
                            読み込み中...
                        </div>
                    ) : userNames.length === 0 ? (
                        <div className="py-12 text-center text-gray-500 text-sm border border-gray-100 rounded-xl bg-gray-50/50">
                            {searchQuery ? '検索条件に一致するデータがありません' : '指定月の交通費申請はありません'}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {userNames.map((userName) => {
                                const userExps = groupedExpenses[userName];
                                const userTotal = userExps.reduce((sum, e) => sum + e.amount, 0);
                                const isExpanded = expandedUsers[userName];

                                return (
                                    <div key={userName} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm transition-all duration-200">
                                        <button
                                            onClick={() => toggleUser(userName)}
                                            className="w-full bg-white hover:bg-gray-50 px-5 py-4 flex items-center justify-between transition-colors focus:outline-none"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm">
                                                    {userName.slice(0, 2).toUpperCase()}
                                                </div>
                                                <div className="text-left">
                                                    <h3 className="font-bold text-gray-800">{userName}</h3>
                                                    <p className="text-xs text-gray-500 mt-1">{userExps.length} 件の申請</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <p className="text-xs font-bold text-gray-400 mb-0.5">交通費 小計</p>
                                                    <p className="font-black text-gray-800 text-lg">¥{userTotal.toLocaleString()}</p>
                                                </div>
                                                <div className="text-gray-400">
                                                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                </div>
                                            </div>
                                        </button>

                                        {isExpanded && (
                                            <div className="bg-gray-50 border-t border-gray-100 overflow-x-auto">
                                                <table className="w-full text-left border-collapse min-w-[600px]">
                                                    <thead>
                                                        <tr className="bg-gray-100/50 text-gray-400 text-[11px] uppercase tracking-wider">
                                                            <th className="px-6 py-3 font-semibold whitespace-nowrap">利用日</th>
                                                            <th className="px-6 py-3 font-semibold text-center whitespace-nowrap">区分</th>
                                                            <th className="px-6 py-3 font-semibold whitespace-nowrap">経路 / 区間</th>
                                                            <th className="px-6 py-3 font-semibold whitespace-nowrap">目的</th>
                                                            <th className="px-6 py-3 font-semibold text-right whitespace-nowrap">金額</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100 bg-white">
                                                        {userExps.map((exp) => {
                                                            const dateStr = new Date(exp.target_date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
                                                            return (
                                                                <tr key={exp.id} className="hover:bg-gray-50/50 transition-colors">
                                                                    <td className="px-6 py-4 text-sm font-bold text-gray-700 whitespace-nowrap">
                                                                        {dateStr}
                                                                    </td>
                                                                    <td className="px-6 py-4 text-center whitespace-nowrap">
                                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${exp.transport_type === 'HOTEL'
                                                                            ? 'bg-purple-50 text-purple-600 border border-purple-100'
                                                                            : exp.is_round_trip
                                                                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                                                : 'bg-blue-50 text-blue-600 border border-blue-100'
                                                                            }`}>
                                                                            {exp.transport_type === 'HOTEL' ? '宿泊' : exp.is_round_trip ? '往復' : '片道'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                        <div className="flex items-center gap-2">
                                                                            {exp.transport_type === 'TRAIN' ? (
                                                                                <Train size={14} className="text-gray-400" />
                                                                            ) : exp.transport_type === 'HOTEL' ? (
                                                                                <Hotel size={14} className="text-gray-400" />
                                                                            ) : (
                                                                                <Bus size={14} className="text-gray-400" />
                                                                            )}
                                                                            <span className="text-sm font-bold text-gray-700 flex items-center gap-1">
                                                                                {exp.departure} {exp.transport_type !== 'HOTEL' && <ChevronRight size={12} className="text-gray-300" />} {exp.transport_type !== 'HOTEL' && exp.arrival}
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-xs text-gray-500 truncate max-w-[150px] whitespace-nowrap">
                                                                        {exp.purpose || '-'}
                                                                    </td>
                                                                    <td className="px-6 py-4 text-right whitespace-nowrap">
                                                                        <span className="font-bold text-gray-800">¥{exp.amount.toLocaleString()}</span>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
