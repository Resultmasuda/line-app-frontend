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
    const [selectedLowExpUser, setSelectedLowExpUser] = useState<string | null>(null);
    
    const lowExpUsers = (() => {
        const allUserIds = Array.from(new Set(shifts.map(s => s.user_id)));
        const usersInfo = allUserIds.map(uid => {
            const userShifts = shifts.filter(s => s.user_id === uid);
            const userExps = expenses.filter(e => (e as any).user_id === uid || (e.users as any)?.id === uid || e.users?.display_name === (userShifts[0] as any)?.users?.display_name);
            
            const userName = (userShifts[0] as any)?.users?.display_name || (userExps[0] as any)?.users?.display_name || '不明';
            
            const shiftDates = Array.from(new Set(userShifts.map(s => s.date))).sort();
            const expDates = Array.from(new Set(userExps.map(e => e.target_date)));
            
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
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 max-w-6xl">
                <div className="w-full lg:w-auto">
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-800 flex items-center gap-3 tracking-tighter">
                        <div className="p-2 bg-brand-gold/10 text-brand-gold rounded-2xl shadow-inner shrink-0">
                            <Receipt size={28} strokeWidth={2.5} />
                        </div>
                        <span className="truncate">交通費・経費管理</span>
                    </h1>
                    <p className="text-[10px] sm:text-sm font-bold text-slate-400 mt-2 uppercase tracking-widest flex items-center gap-2">
                        <Bookmark size={14} className="text-brand-gold shrink-0" /> <span className="truncate">交通費・経費精算管理</span>
                    </p>
                </div>

                <div className="flex items-center justify-between lg:justify-end gap-4 bg-white px-5 py-2.5 border border-slate-200 rounded-[20px] shadow-sm w-full lg:w-auto">
                    <button onClick={handlePrevMonth} className="p-1.5 text-slate-400 hover:bg-slate-50 hover:text-brand-blue rounded-xl transition-all">
                        <ChevronLeft size={20} strokeWidth={2.5} />
                    </button>
                    <span className="font-black text-slate-700 min-w-[120px] text-center tracking-tight whitespace-nowrap">
                        {currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月
                    </span>
                    <button onClick={handleNextMonth} className="p-1.5 text-slate-400 hover:bg-slate-50 hover:text-brand-blue rounded-xl transition-all">
                        <ChevronRight size={20} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-6xl">
                <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex items-center justify-between group overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700"></div>
                    <div className="relative z-10 w-full">
                        <p className="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">月間申請合計</p>
                        <p className="text-3xl font-black text-slate-800 tracking-tighter">¥{totalAmount.toLocaleString()}</p>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-brand-blue/10 text-brand-blue flex items-center justify-center relative z-10 shadow-inner group-hover:rotate-12 transition-transform">
                        <Receipt size={28} strokeWidth={2.5} />
                    </div>
                </div>
                <button 
                    onClick={() => setShowLowExpUsersModal(true)}
                    className="bg-white p-6 rounded-[32px] shadow-sm border border-rose-100 flex items-center justify-between hover:shadow-xl hover:shadow-rose-100 transition-all text-left relative group overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700"></div>
                    <div className="relative z-10 w-full">
                        <p className="text-[10px] font-black text-rose-500 mb-1 uppercase tracking-widest flex items-center gap-1">
                            <AlertTriangle size={12} strokeWidth={3} /> 未申請アラート
                        </p>
                        <p className="text-3xl font-black text-slate-800 tracking-tighter">{lowExpUsers.length} <span className="text-sm font-bold text-slate-400 tracking-normal">名</span></p>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center relative z-10 shadow-inner group-hover:-rotate-12 transition-transform">
                        <Users size={28} strokeWidth={2.5} />
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
                        <button onClick={handleXlsxExport} className="flex-1 md:flex-none justify-center flex items-center gap-2 px-5 py-2.5 bg-brand-blue text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-deep-blue transition-all shadow-lg shadow-brand-blue/20 active:scale-95">
                            <Download size={16} strokeWidth={2.5} />
                            Excel出力
                        </button>
                    </div>
                </div>

                <div className="p-4">
                    {isLoading ? (
                        <div className="py-12 text-center text-gray-400">
                            <div className="flex justify-center mb-2">
                                <div className="animate-spin w-6 h-6 border-2 border-brand-blue border-t-transparent rounded-full"></div>
                            </div>
                            読み込み中...
                        </div>
                    ) : userNames.length === 0 ? (
                        <div className="py-12 text-center text-slate-500 text-sm border border-slate-100 rounded-[32px] bg-slate-50/50">
                            {searchQuery ? '検索条件に一致するデータがありません' : '指定月の交通費申請はありません'}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {userNames.map((userName) => {
                                const userExps = groupedExpenses[userName];
                                const userTotal = userExps.reduce((sum, e) => sum + e.amount, 0);
                                const isExpanded = expandedUsers[userName];

                                return (
                                    <div key={userName} className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden group transition-all hover:shadow-xl hover:shadow-slate-200/50 mb-4 last:mb-0">
                                        <button
                                            onClick={() => toggleUser(userName)}
                                            className="w-full bg-white hover:bg-slate-50/50 px-6 py-5 flex items-center justify-between transition-all focus:outline-none group/btn"
                                        >
                                            <div className="flex items-center gap-5 flex-1 min-w-0">
                                                <div className="w-12 h-12 rounded-2xl bg-brand-blue/5 text-brand-blue flex items-center justify-center font-black text-sm flex-shrink-0 border border-brand-blue/10 shadow-inner group-hover:rotate-6 transition-transform">
                                                    {userName.slice(0, 1).toUpperCase()}
                                                </div>
                                                <div className="text-left truncate">
                                                    <h3 className="font-black text-slate-800 truncate text-base tracking-tight">{userName}</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] font-black text-brand-blue bg-brand-blue/5 px-2 py-0.5 rounded-lg uppercase tracking-tighter border border-brand-blue/10">{userExps.length} 件の申請</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-10 flex-shrink-0 ml-4">
                                                <div className="text-right">
                                                    <p className="text-[9px] font-black text-slate-300 mb-0.5 uppercase tracking-widest">小計</p>
                                                    <p className="font-black text-slate-800 text-2xl tracking-tighter">¥{userTotal.toLocaleString()}</p>
                                                </div>
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isExpanded ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' : 'bg-slate-50 text-slate-300'}`}>
                                                    {isExpanded ? <ChevronUp size={20} strokeWidth={3} /> : <ChevronDown size={20} strokeWidth={3} />}
                                                </div>
                                            </div>
                                        </button>

                                        {isExpanded && (
                                            <div className="bg-slate-50/30 border-t border-slate-100 overflow-x-auto">
                                                <table className="w-full text-left border-collapse min-w-[600px]">
                                                    <thead>
                                                        <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase tracking-widest">
                                                            <th className="px-8 py-4 font-black whitespace-nowrap w-[120px]">利用日</th>
                                                            <th className="px-8 py-4 font-black text-center whitespace-nowrap w-[120px]">区分</th>
                                                            <th className="px-8 py-4 font-black whitespace-nowrap min-w-[200px]">経路 / 区間</th>
                                                            <th className="px-8 py-4 font-black whitespace-nowrap min-w-[200px]">目的</th>
                                                            <th className="px-8 py-4 font-black text-right whitespace-nowrap w-[140px]">金額</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 bg-white">
                                                        {userExps.map((exp) => {
                                                            const dateStr = new Date(exp.target_date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' });
                                                            return (
                                                                <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                                                                    <td className="px-8 py-5 text-sm font-black text-slate-700 whitespace-nowrap">
                                                                        {dateStr}
                                                                    </td>
                                                                    <td className="px-8 py-5 text-center whitespace-nowrap">
                                                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter border ${exp.transport_type === 'HOTEL'
                                                                            ? 'bg-purple-50 text-purple-600 border-purple-100'
                                                                            : exp.transport_type === 'COMMUTER_PASS'
                                                                                ? 'bg-brand-gold/10 text-brand-gold border-brand-gold/30'
                                                                                : exp.transport_type === 'COMMUTER_USE'
                                                                                    ? 'bg-cyan-50 text-cyan-600 border-cyan-100'
                                                                                    : exp.is_round_trip
                                                                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                                                        : 'bg-brand-blue/5 text-brand-blue border-brand-blue/10'
                                                                            }`}>
                                                                            {exp.transport_type === 'HOTEL' ? '宿泊' : exp.transport_type === 'COMMUTER_PASS' ? '定期券' : exp.transport_type === 'COMMUTER_USE' ? '定期利用' : exp.is_round_trip ? '往復' : '片道'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-8 py-5 whitespace-normal min-w-[200px]">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center flex-shrink-0">
                                                                                {exp.transport_type === 'TRAIN' ? (
                                                                                    <Train size={14} />
                                                                                ) : exp.transport_type === 'HOTEL' ? (
                                                                                    <Hotel size={14} />
                                                                                ) : (exp.transport_type === 'COMMUTER_PASS' || exp.transport_type === 'COMMUTER_USE') ? (
                                                                                    <Bookmark size={14} className="text-brand-gold" />
                                                                                ) : (
                                                                                    <Bus size={14} />
                                                                                )}
                                                                            </div>
                                                                            <span className="text-sm font-black text-slate-700 break-all leading-tight">
                                                                                {exp.departure} {exp.transport_type !== 'HOTEL' && <ChevronRight size={14} className="inline text-slate-300 mx-1" />} {exp.transport_type !== 'HOTEL' && exp.arrival}
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-8 py-5 text-xs font-bold text-slate-400 min-w-[200px] whitespace-normal break-words leading-relaxed">
                                                                        {exp.purpose || '-'}
                                                                    </td>
                                                                    <td className="px-8 py-5 text-right whitespace-nowrap">
                                                                        <span className="font-black text-slate-800 text-lg tracking-tighter">¥{exp.amount.toLocaleString()}</span>
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4" onClick={() => { setShowLowExpUsersModal(false); setSelectedLowExpUser(null); }}>
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white relative">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-400 to-rose-600"></div>
                            <div className="flex items-center gap-4">
                                {selectedLowExpUser && (
                                    <button 
                                        onClick={() => setSelectedLowExpUser(null)}
                                        className="p-2 -ml-2 text-slate-400 hover:text-brand-blue hover:bg-slate-50 rounded-xl transition-all"
                                    >
                                        <ChevronLeft size={24} strokeWidth={2.5} />
                                    </button>
                                )}
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3 tracking-tighter">
                                        <div className="p-2 bg-rose-50 text-rose-500 rounded-2xl">
                                            <AlertTriangle size={24} strokeWidth={2.5} />
                                        </div>
                                        {selectedLowExpUser ? `${lowExpUsers.find(u => u.id === selectedLowExpUser)?.name} の未申請詳細` : '交通費 未申請アラート'}
                                    </h3>
                                    <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">
                                        {selectedLowExpUser ? '未申請の日付詳細' : '交通費 未申請アラート (概要)'}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => { setShowLowExpUsersModal(false); setSelectedLowExpUser(null); }}
                                className="p-3 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-2xl transition-all active:scale-90"
                            >
                                <X size={24} strokeWidth={2.5} />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-8 bg-white">
                            {!selectedLowExpUser ? (
                                <>
                                    <div className="bg-rose-50 rounded-3xl p-6 mb-8 border border-rose-100/50">
                                        <p className="text-sm font-bold text-rose-700 leading-relaxed flex gap-3">
                                            <div className="w-5 h-5 rounded-full bg-rose-200 text-rose-600 flex items-center justify-center flex-shrink-0 text-[10px] font-black mt-0.5">!</div>
                                            当月の稼働日数に対して、交通費の申請が極端に少ないスタッフです。名前をクリックして未申請の日付を確認してください。
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        {lowExpUsers.length === 0 ? (
                                            <div className="text-center py-20 text-slate-300">
                                                <p className="font-black text-sm uppercase tracking-widest">該当するスタッフはいません</p>
                                            </div>
                                        ) : (
                                            lowExpUsers.map((u) => (
                                                <button 
                                                    key={u.id} 
                                                    onClick={() => setSelectedLowExpUser(u.id)}
                                                    className="w-full text-left bg-slate-50/50 rounded-3xl p-5 border border-slate-100 flex flex-wrap items-center justify-between gap-4 group hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-white text-slate-400 flex items-center justify-center font-black text-sm border border-slate-100 shadow-sm group-hover:bg-brand-blue group-hover:text-white group-hover:border-brand-blue transition-all">
                                                            {u.name.slice(0, 1).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-black text-slate-800 text-base tracking-tight">{u.name}</h4>
                                                            <div className="flex items-center gap-3 mt-1">
                                                                <span className="text-[10px] font-black text-rose-500 uppercase tracking-tighter">申請率: {Math.round((u.expCount / u.shiftCount) * 100)}%</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-6 ml-auto sm:ml-0">
                                                        <div className="text-center bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
                                                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5">稼働日数</p>
                                                            <p className="font-black text-slate-800 text-lg tracking-tighter">{u.shiftCount}</p>
                                                        </div>
                                                        <div className="text-center bg-white px-4 py-2 rounded-2xl border border-rose-100 shadow-sm">
                                                            <p className="text-[9px] font-black text-rose-300 uppercase tracking-widest mb-0.5">申請済み</p>
                                                            <p className="font-black text-rose-500 text-lg tracking-tighter">{u.expCount}</p>
                                                        </div>
                                                        <ChevronRight size={20} className="text-slate-300 group-hover:text-brand-blue transition-colors ml-2" />
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="animate-in slide-in-from-right-4 duration-300">
                                    <div className="bg-slate-50 rounded-3xl p-6 mb-8 border border-slate-100">
                                        <h4 className="text-slate-500 font-black text-[10px] uppercase tracking-widest mb-4">未申請の可能性がある日付の一覧</h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {lowExpUsers.find(u => u.id === selectedLowExpUser)?.missingDates.map(date => {
                                                const d = new Date(date);
                                                const isSunday = d.getDay() === 0;
                                                const isSaturday = d.getDay() === 6;
                                                return (
                                                    <div key={date} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-1">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                                            {d.getFullYear()}年{d.getMonth() + 1}月
                                                        </span>
                                                        <span className={`text-xl font-black tracking-tighter ${isSunday ? 'text-rose-500' : isSaturday ? 'text-brand-blue' : 'text-slate-700'}`}>
                                                            {d.getDate()}<span className="text-xs ml-0.5">({['日','月','火','水','木','金','土'][d.getDay()]})</span>
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <p className="text-xs font-bold text-slate-400 text-center leading-relaxed px-4">
                                        ※ 上記の日付はシフトが設定されていますが、交通費申請が確認できません。<br/>スタッフに直接確認を行うか、申請漏れがないかチェックしてください。
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="p-8 border-t border-slate-100 bg-slate-50/30">
                            <button 
                                onClick={() => {
                                    if (selectedLowExpUser) {
                                        setSelectedLowExpUser(null);
                                    } else {
                                        setShowLowExpUsersModal(false);
                                    }
                                }}
                                className="w-full py-4 bg-slate-800 text-white rounded-[20px] font-black text-sm uppercase tracking-widest shadow-lg shadow-slate-200 transition-all hover:bg-slate-900 active:scale-[0.98]"
                            >
                                {selectedLowExpUser ? 'スタッフ一覧に戻る' : 'ダッシュボードを閉じる'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
