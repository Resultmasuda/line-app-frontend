"use client";
import React, { useState, useEffect } from 'react';
import { Receipt, Search, Filter, Download, ArrowDownToLine, ChevronLeft, ChevronRight, Train, Bus, Hotel, ChevronDown, ChevronUp, Bookmark, X, AlertTriangle, Users } from 'lucide-react';
import { getAllExpenses, getAllShifts, getAllAttendances } from '@/lib/api/admin';

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

type ShiftRecord = {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    location: string;
    user_id: string;
};

type AttendanceRecord = {
    id: string;
    user_id: string;
    date: string;
    type: 'WAKE_UP' | 'LEAVE' | 'CLOCK_IN' | 'CLOCK_OUT';
    timestamp: string;
};

export default function AdminExpensesPage() {
    const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
    const [shifts, setShifts] = useState<ShiftRecord[]>([]);
    const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // 現在の表示月 (デフォルトは今月)
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const ym = `${year}-${month}`;

            const [expRes, shiftRes, attRes] = await Promise.all([
                getAllExpenses(ym),
                getAllShifts(ym),
                getAllAttendances(ym)
            ]);

            if (expRes.success && expRes.data) setExpenses(expRes.data);
            if (shiftRes.success && shiftRes.data) setShifts(shiftRes.data);
            if (attRes.success && attRes.data) setAttendances(attRes.data);

            setIsLoading(false);
        }
        fetchData();
    }, [currentDate]);

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const filteredExpenses = expenses.filter(exp => {
        const displayName = exp.users?.display_name || '';
        return (
            displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            exp.departure.toLowerCase().includes(searchQuery.toLowerCase()) ||
            exp.arrival.toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

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

    // 稼働日数に対して申請が少ないユーザーを特定
    const [showLowExpUsersModal, setShowLowExpUsersModal] = useState(false);
    
    const lowExpUsers = (() => {
        const allUserIds = Array.from(new Set(shifts.map(s => s.user_id)));
        const usersInfo = allUserIds.map(uid => {
            const userShifts = shifts.filter(s => s.user_id === uid);
            const userExps = expenses.filter(e => (e as any).user_id === uid || (e.users as any)?.id === uid || e.users?.display_name === (userShifts[0] as any)?.users?.display_name);
            
            // 実際にはAPIレスポンスの形に合わせる必要があるが、
            // 現状の ExpenseRecord & ShiftRecord から推測
            const userName = (userShifts[0] as any)?.users?.display_name || (userExps[0] as any)?.users?.display_name || '不明';
            
            const shiftDates = Array.from(new Set(userShifts.map(s => s.date)));
            const expDates = Array.from(new Set(userExps.map(e => e.target_date)));
            
            // 申請漏れの疑い: シフトがあるのに、その日に交通費申請がない（定期券等を除く）
            const missingDates = shiftDates.filter(d => !expDates.includes(d));
            
            return {
                id: uid,
                name: userName,
                shiftCount: shiftDates.length,
                expCount: expDates.length,
                missingCount: missingDates.length,
                missingDates
            };
        });

        return usersInfo.filter(u => u.missingCount > 0).sort((a, b) => b.missingCount - a.missingCount);
    })();

    const handleXlsxExport = () => {
        if (expenses.length === 0) {
            alert("出力するデータがありません");
            return;
        }

        import('xlsx').then((XLSX) => {
            const wb = XLSX.utils.book_new();

            // ヘッダー（勤怠＋交通費）
            const headers = [
                '利用日', '店舗/場所', '予定時間', 
                '起床', '出発', '出勤', '退勤',
                '種別', '区分', '区間/宿泊先', '到着', '目的/備考', '金額'
            ];

            // ユーザーごとに集計
            const usersWithData = Array.from(new Set([
                ...expenses.map(e => e.users?.display_name),
                ...shifts.map(s => (s as any).users?.display_name)
            ])).filter(Boolean).sort() as string[];

            usersWithData.forEach((userName) => {
                const rows: any[] = [];
                const userExpenses = expenses.filter(e => e.users?.display_name === userName);
                const userShifts = shifts.filter(s => (s as any).users?.display_name === userName);
                const userAttendances = attendances.filter(a => (a as any).users?.display_name === userName);

                // 全ての日付を抽出
                const allDates = Array.from(new Set([
                    ...userExpenses.map(e => e.target_date),
                    ...userShifts.map(s => s.date)
                ])).sort();

                allDates.forEach(date => {
                    const dayShifts = userShifts.filter(s => s.date === date);
                    const dayExps = userExpenses.filter(e => e.target_date === date);
                    const dayAtts = userAttendances.filter(a => a.date === date);

                    const wakeUp = dayAtts.find(a => a.type === 'WAKE_UP')?.timestamp;
                    const leave = dayAtts.find(a => a.type === 'LEAVE')?.timestamp;
                    const clockIn = dayAtts.find(a => a.type === 'CLOCK_IN')?.timestamp;
                    const clockOut = dayAtts.find(a => a.type === 'CLOCK_OUT')?.timestamp;

                    const formatTime = (ts?: string) => ts ? new Date(ts).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '';

                    // シフトまたは交通費がある場合に1行作成
                    // 交通費が複数ある場合は複数行
                    const maxRows = Math.max(1, dayExps.length);
                    for (let i = 0; i < maxRows; i++) {
                        const exp = dayExps[i];
                        const shift = dayShifts[0]; // 基本1日1店舗想定

                        rows.push([
                            i === 0 ? date : '', // 日付は最初の行だけ
                            (i === 0 && shift) ? shift.location : '',
                            (i === 0 && shift) ? `${shift.start_time.substring(0, 5)}〜${shift.end_time.substring(0, 5)}` : '',
                            (i === 0) ? formatTime(wakeUp) : '',
                            (i === 0) ? formatTime(leave) : '',
                            (i === 0) ? formatTime(clockIn) : '',
                            (i === 0) ? formatTime(clockOut) : '',
                            exp ? (exp.transport_type === 'TRAIN' ? '電車' : exp.transport_type === 'HOTEL' ? '宿泊' : exp.transport_type === 'COMMUTER_PASS' ? '定期券' : 'バス') : '',
                            exp ? (exp.transport_type === 'HOTEL' ? '宿泊' : exp.transport_type === 'COMMUTER_PASS' ? '新規購入' : exp.is_round_trip ? '往復' : '片道') : '',
                            exp ? exp.departure : '',
                            exp ? (exp.arrival || '') : '',
                            exp ? (exp.purpose || '') : '',
                            exp ? exp.amount : 0
                        ]);
                    }
                });

                const userTotal = userExpenses.reduce((sum, e) => sum + e.amount, 0);
                rows.push(['', '', '', '', '', '', '', '', '', '', '', '合計', userTotal]);

                const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
                XLSX.utils.book_append_sheet(wb, ws, userName.substring(0, 31));
            });

            const fileName = `attendance_expenses_${currentDate.getFullYear()}_${String(currentDate.getMonth() + 1).padStart(2, '0')}.xlsx`;
            XLSX.writeFile(wb, fileName);
        });
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
                <button 
                    onClick={() => setShowLowExpUsersModal(true)}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-red-100 flex items-center justify-between hover:bg-red-50/50 transition-colors text-left"
                >
                    <div>
                        <p className="text-sm font-bold text-red-500 mb-1 flex items-center gap-1">
                            <AlertTriangle size={14} /> 交通費 未申請(疑い)
                        </p>
                        <p className="text-3xl font-black text-gray-800 tracking-tight">{lowExpUsers.length} <span className="text-sm font-bold text-gray-400">名</span></p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
                        <Users size={24} />
                    </div>
                </button>
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
                        <button onClick={handleXlsxExport} className="flex-1 md:flex-none justify-center flex items-center gap-2 px-3 py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold hover:bg-emerald-600 transition-colors shadow-sm">
                            <Download size={16} />
                            Excel出力
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
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                                                    {userName.slice(0, 2).toUpperCase()}
                                                </div>
                                                <div className="text-left truncate">
                                                    <h3 className="font-bold text-gray-800 truncate">{userName}</h3>
                                                    <p className="text-xs text-gray-500 mt-1">{userExps.length} 件の申請</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6 flex-shrink-0 ml-4">
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
                                                            <th className="px-6 py-3 font-semibold whitespace-nowrap w-[100px]">利用日</th>
                                                            <th className="px-6 py-3 font-semibold text-center whitespace-nowrap w-[100px]">区分</th>
                                                            <th className="px-6 py-3 font-semibold whitespace-nowrap min-w-[200px]">経路 / 区間</th>
                                                            <th className="px-6 py-3 font-semibold whitespace-nowrap min-w-[200px]">目的</th>
                                                            <th className="px-6 py-3 font-semibold text-right whitespace-nowrap w-[120px]">金額</th>
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
                                                                            : exp.transport_type === 'COMMUTER_PASS'
                                                                                ? 'bg-orange-50 text-orange-600 border border-orange-100'
                                                                                : exp.transport_type === 'COMMUTER_USE'
                                                                                    ? 'bg-cyan-50 text-cyan-600 border border-cyan-100'
                                                                                    : exp.is_round_trip
                                                                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                                                        : 'bg-blue-50 text-blue-600 border border-blue-100'
                                                                            }`}>
                                                                            {exp.transport_type === 'HOTEL' ? '宿泊' : exp.transport_type === 'COMMUTER_PASS' ? '定期券' : exp.transport_type === 'COMMUTER_USE' ? '定期利用' : exp.is_round_trip ? '往復' : '片道'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-normal min-w-[200px]">
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            {exp.transport_type === 'TRAIN' ? (
                                                                                <Train size={14} className="text-gray-400" />
                                                                            ) : exp.transport_type === 'HOTEL' ? (
                                                                                <Hotel size={14} className="text-gray-400" />
                                                                            ) : (exp.transport_type === 'COMMUTER_PASS' || exp.transport_type === 'COMMUTER_USE') ? (
                                                                                <Bookmark size={14} className="text-emerald-500" />
                                                                            ) : (
                                                                                <Bus size={14} className="text-gray-400" />
                                                                            )}
                                                                            <span className="text-sm font-bold text-gray-700 flex items-center gap-1 break-all">
                                                                                {exp.departure} {exp.transport_type !== 'HOTEL' && <ChevronRight size={12} className="text-gray-300 flex-shrink-0" />} {exp.transport_type !== 'HOTEL' && exp.arrival}
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-xs text-gray-500 min-w-[200px] whitespace-normal break-words leading-relaxed">
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

            {/* Low Expense Users Modal */}
            {showLowExpUsersModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowLowExpUsersModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-red-50/30">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <AlertTriangle className="text-red-500" size={20} />
                                    交通費 未申請の疑いがあるスタッフ
                                </h3>
                                <p className="text-xs text-gray-500">シフトに対して申請日数が不足しているスタッフ一覧</p>
                            </div>
                            <button onClick={() => setShowLowExpUsersModal(false)} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {lowExpUsers.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    該当するスタッフはいません
                                </div>
                            ) : (
                                lowExpUsers.map(u => (
                                    <div key={u.id} className="border border-gray-100 rounded-xl p-4 flex items-center justify-between hover:bg-gray-50 transition-colors bg-white shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-bold">
                                                {u.name.slice(0, 1)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-800">{u.name}</div>
                                                <div className="text-[10px] text-gray-500">
                                                    稼働: {u.shiftCount}日 / 交通費申請: {u.expCount}日
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-red-600 font-black text-lg">
                                                -{u.missingCount} <span className="text-[10px]">日分</span>
                                            </div>
                                            <div className="text-[9px] text-gray-400">未申請の可能性</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100">
                            <button 
                                onClick={() => setShowLowExpUsersModal(false)}
                                className="w-full py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                                閉じる
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
