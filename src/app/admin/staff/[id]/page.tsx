"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, CalendarClock, Receipt, MapPin, Play, Square, UserCheck, UserX, Sun, Navigation } from 'lucide-react';
import { getUserProfile, AdminUserRecord } from '@/lib/api/admin';
import { getMonthlyShifts, ShiftRecord } from '@/lib/api/shift';
import { getMonthlyAttendances, AttendanceRecord } from '@/lib/api/attendance';
import { getMonthlyExpenses, ExpenseRecord } from '@/lib/api/expense';

export default function StaffDetailView() {
    const params = useParams();
    const router = useRouter();
    const userId = params.id as string;

    const [user, setUser] = useState<AdminUserRecord | null>(null);
    const [shifts, setShifts] = useState<ShiftRecord[]>([]);
    const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
    const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        async function fetchAllData() {
            if (!userId) return;
            setIsLoading(true);

            // 並列でユーザー情報、シフト、打刻、交通費を取得
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const ym = `${year}-${month}`;

            const [userRes, shiftRes, attRes, expRes] = await Promise.all([
                getUserProfile(userId),
                getMonthlyShifts(userId, ym),
                getMonthlyAttendances(userId, ym),
                getMonthlyExpenses(userId, ym)
            ]);

            if (userRes.success && userRes.data) setUser(userRes.data);
            if (shiftRes.success && shiftRes.data) setShifts(shiftRes.data);
            if (attRes.success && attRes.data) setAttendances(attRes.data);
            if (expRes.success && expRes.data) setExpenses(expRes.data);

            setIsLoading(false);
        }

        fetchAllData();
    }, [userId, currentDate]);

    const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const getShiftAttendances = (date: string) => attendances.filter(a => a.date === date);

    if (isLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="text-center py-20 text-gray-500">
                ユーザー情報が見つかりませんでした。<br />
                <button onClick={() => router.back()} className="text-emerald-500 underline mt-4">戻る</button>
            </div>
        );
    }

    const currentMonthStr = `${currentDate.getFullYear()}年 ${currentDate.getMonth() + 1}月`;
    const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

    return (
        <div className="space-y-6 max-w-5xl">
            {/* ヘッダー */}
            <div className="flex items-center gap-4 mb-2">
                <button
                    onClick={() => router.push('/admin/staff')}
                    className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                >
                    <ChevronLeft size={20} className="text-gray-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        {user.display_name} の詳細ダッシュボード
                        <span className={`px-2.5 py-1 text-[10px] rounded-full font-bold border ${user.role === 'admin' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                            {user.role === 'admin' ? '管理者' : 'スタッフ'}
                        </span>
                    </h1>
                    <p className="text-xs text-gray-400 font-mono mt-1">ID: {user.id}</p>
                </div>
            </div>

            {/* 当月のサマリーカード */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <button onClick={handlePrevMonth} className="px-3 py-1.5 text-gray-500 bg-gray-50 rounded-lg font-bold hover:bg-gray-100">先月</button>
                    <span className="font-black text-xl text-gray-800 tracking-tight w-32 text-center">{currentMonthStr}</span>
                    <button onClick={handleNextMonth} className="px-3 py-1.5 text-gray-500 bg-gray-50 rounded-lg font-bold hover:bg-gray-100">翌月</button>
                </div>

                <div className="flex gap-8">
                    <div>
                        <p className="text-xs font-bold text-gray-400 mb-1">当月シフト数</p>
                        <p className="text-2xl font-black text-gray-800">{shifts.length} <span className="text-sm text-gray-500 font-bold">日</span></p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 mb-1">当月交通費総額</p>
                        <p className="text-2xl font-black text-emerald-600"><span className="text-sm font-bold mr-1">¥</span>{totalExpense.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 左列：シフトと打刻の突合 */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[600px]">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                        <CalendarClock size={18} className="text-indigo-500" />
                        <h2 className="font-bold text-gray-700">シフト・出退勤ログ ({shifts.length}件)</h2>
                    </div>
                    <div className="p-4 overflow-y-auto flex-1 space-y-4">
                        {shifts.length === 0 ? (
                            <p className="text-center text-gray-400 text-sm mt-10">今月のシフトはありません</p>
                        ) : (
                            shifts.map(shift => {
                                const d = new Date(shift.date);
                                const dateStr = `${d.getMonth() + 1}/${d.getDate()} (${["日", "月", "火", "水", "木", "金", "土"][d.getDay()]})`;
                                const atts = getShiftAttendances(shift.date);
                                const isFuture = new Date(shift.date) > new Date();

                                const clockIn = atts.find(a => a.type === 'CLOCK_IN');
                                const clockOut = atts.find(a => a.type === 'CLOCK_OUT');
                                const wakeUp = atts.find(a => a.type === 'WAKE_UP');
                                const leave = atts.find(a => a.type === 'LEAVE');

                                return (
                                    <div key={shift.id} className="border border-gray-100 rounded-xl p-4 shadow-sm hover:border-emerald-100 transition-colors">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="font-bold text-gray-800 text-sm">{dateStr}</span>
                                            <span className="flex items-center gap-1 text-[11px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded">
                                                <MapPin size={10} /> {shift.location}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-gray-50 pb-3 mb-3">
                                            <span className="text-xs font-bold text-gray-400">予定</span>
                                            <span className="text-sm font-black text-gray-700">{shift.start_time.substring(0, 5)} 〜 {shift.end_time.substring(0, 5)}</span>
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-gray-400">実績</span>
                                            {isFuture ? (
                                                <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full text-center">予定</span>
                                            ) : (
                                                <div className="flex flex-col gap-1 items-end">
                                                    <div className="flex items-center gap-2">
                                                        {wakeUp && (
                                                            <span className="text-xs text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded flex items-center shadow-sm border border-amber-100">
                                                                <Sun size={12} className="mr-1" /> 起床 {new Date(wakeUp.timestamp!).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        )}
                                                        {leave && (
                                                            <span className="text-xs text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded flex items-center shadow-sm border border-blue-100">
                                                                <Navigation size={12} className="mr-1" /> 出発 {new Date(leave.timestamp!).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {clockIn ? (
                                                            <span className="text-xs font-bold text-emerald-600 flex items-center"><Play size={12} className="mr-0.5" /> {new Date(clockIn.timestamp!).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                                                        ) : (
                                                            <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded flex items-center"><UserX size={10} className="mr-0.5" /> 未出勤</span>
                                                        )}
                                                        <span className="text-gray-300">〜</span>
                                                        {clockOut ? (
                                                            <span className="text-xs font-bold text-blue-600 flex items-center"><Square size={12} className="mr-0.5" /> {new Date(clockOut.timestamp!).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                                                        ) : clockIn && !isFuture ? (
                                                            <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">未退勤</span>
                                                        ) : (
                                                            <span className="text-gray-300 text-xs">--:--</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* 右列：交通費申請 */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[600px]">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                        <Receipt size={18} className="text-emerald-500" />
                        <h2 className="font-bold text-gray-700">交通費申請ログ ({expenses.length}件)</h2>
                    </div>
                    <div className="p-4 overflow-y-auto flex-1 space-y-4">
                        {expenses.length === 0 ? (
                            <p className="text-center text-gray-400 text-sm mt-10">今月の交通費申請はありません</p>
                        ) : (
                            expenses.map(exp => {
                                const d = new Date(exp.target_date);
                                const dateStr = `${d.getMonth() + 1}/${d.getDate()} (${["日", "月", "火", "水", "木", "金", "土"][d.getDay()]})`;

                                return (
                                    <div key={exp.id} className="border border-gray-100 rounded-xl p-4 shadow-sm">
                                        <div className="flex justify-between items-start mb-2 border-b border-gray-50 pb-2">
                                            <div>
                                                <span className="font-bold text-gray-800 text-sm">{dateStr}</span>
                                                <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${exp.is_round_trip ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                                    {exp.is_round_trip ? '往復' : '片道'}
                                                </span>
                                            </div>
                                            <span className="font-black text-gray-800 text-lg">¥{exp.amount.toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-sm font-bold text-gray-600 mt-1">
                                            {exp.transport_type === 'TRAIN' ? '🚃' : '🚌'}
                                            <span className="truncate max-w-[100px]">{exp.departure}</span>
                                            <span className="text-gray-300">→</span>
                                            <span className="truncate max-w-[100px]">{exp.arrival}</span>
                                        </div>
                                        {exp.purpose && (
                                            <p className="text-[11px] text-gray-400 mt-1.5 font-medium truncate">{exp.purpose}</p>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
