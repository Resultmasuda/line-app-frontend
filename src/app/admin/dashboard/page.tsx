"use client";
import React, { useState, useEffect } from 'react';
import { getTodayAllAttendances, getAllExpenses, getAllShifts, getPendingHolidayRequests, updateHolidayRequestStatus } from '@/lib/api/admin';
import { Play, Square, Sun, Navigation, MapPin, Receipt, Clock, AlertTriangle, CheckCircle, XCircle, CalendarOff } from 'lucide-react';

interface BaseAdminRecord {
    id: string;
    users: { display_name: string };
}
interface AdminAttendance extends BaseAdminRecord {
    type: string;
    timestamp: string;
}
interface AdminExpense extends BaseAdminRecord {
    target_date: string;
    departure: string;
    arrival: string;
    transport_type: string;
    is_round_trip: boolean;
    amount: number;
}
interface AdminShift extends BaseAdminRecord {
    date: string;
    location: string;
    start_time: string;
    end_time: string;
}

export default function AdminDashboardPage() {
    const [attendances, setAttendances] = useState<AdminAttendance[]>([]);
    const [expenses, setExpenses] = useState<AdminExpense[]>([]);
    const [shifts, setShifts] = useState<AdminShift[]>([]);
    const [pendingHolidays, setPendingHolidays] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const fetchDashboardData = async () => {
            const today = new Date().toISOString().split('T')[0];
            const thisMonth = new Date().toISOString().substring(0, 7); // YYYY-MM

            try {
                const [attRes, expRes, shiftRes, holRes] = await Promise.all([
                    getTodayAllAttendances(today),
                    getAllExpenses(thisMonth),
                    getAllShifts(thisMonth),
                    getPendingHolidayRequests()
                ]);

                if (isMounted) {
                    if (attRes.success) setAttendances(attRes.data || []);
                    if (expRes.success) setExpenses(expRes.data || []);
                    if (shiftRes.success) setShifts(shiftRes.data || []);
                    if (holRes.success) setPendingHolidays(holRes.data || []);
                }
            } catch (err) {
                console.error("Dashboard fetch error:", err);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchDashboardData();

        return () => { isMounted = false; };
    }, []);

    if (isLoading) {
        return (
            <div className="h-64 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const todaysShifts = shifts.filter(s => s.date === todayStr);

    // 簡易的な現在のステータス算出 (最後の打刻で判定)
    const currentStatusByUser: Record<string, AdminAttendance> = {};
    attendances.forEach(a => {
        currentStatusByUser[a.users.display_name] = a;
    });

    const getStatusBadge = (type: string) => {
        switch (type) {
            case 'WAKE_UP': return <span className="bg-amber-100 text-amber-700 font-bold px-2.5 py-1 rounded text-xs flex items-center gap-1 w-fit"><Sun size={12} /> 起床済</span>;
            case 'LEAVE': return <span className="bg-blue-100 text-blue-700 font-bold px-2.5 py-1 rounded text-xs flex items-center gap-1 w-fit"><Navigation size={12} /> 移動中</span>;
            case 'CLOCK_IN': return <span className="bg-emerald-100 text-emerald-700 font-bold px-2.5 py-1 rounded text-xs flex items-center gap-1 w-fit"><Play size={12} /> 勤務中</span>;
            case 'CLOCK_OUT': return <span className="bg-gray-100 text-gray-600 font-bold px-2.5 py-1 rounded text-xs flex items-center gap-1 w-fit"><Square size={12} /> 退勤済</span>;
            default: return <span className="bg-gray-100 text-gray-500 font-bold px-2.5 py-1 rounded text-xs w-fit">未稼働</span>;
        }
    };

    const formatTime = (isoString?: string) => {
        if (!isoString) return '--:--';
        const d = new Date(isoString);
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    };

    const now = new Date();
    const isShiftLate = (shift: AdminShift) => {
        const shiftStartTime = new Date(`${todayStr}T${shift.start_time}`);
        const att = currentStatusByUser[shift.users.display_name];
        const hasClockedIn = att && (att.type === 'CLOCK_IN' || att.type === 'CLOCK_OUT');
        // If current time is past start time + 5 mins grace period, flag as late
        return (now.getTime() - shiftStartTime.getTime() > 5 * 60 * 1000) && !hasClockedIn;
    };

    const handleHolidayAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
        setActionLoading(id);
        const res = await updateHolidayRequestStatus(id, status);
        if (res.success) {
            setPendingHolidays(prev => prev.filter(h => h.id !== id));
        } else {
            alert('処理に失敗しました');
        }
        setActionLoading(null);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">本日のサマリー</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* 左側: 本日の出勤状況 */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-5 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                        <h2 className="font-bold text-gray-700 flex items-center gap-2">
                            <Clock className="text-emerald-500" size={18} />
                            リアルタイム稼働状況 ({Object.keys(currentStatusByUser).length}名)
                        </h2>
                    </div>
                    <div className="p-0">
                        {Object.keys(currentStatusByUser).length === 0 ? (
                            <div className="p-8 text-center text-sm font-bold text-gray-400">本日の打刻データはありません</div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wider">
                                        <th className="px-5 py-3 font-semibold">スタッフ</th>
                                        <th className="px-5 py-3 font-semibold">現在ステータス</th>
                                        <th className="px-5 py-3 font-semibold">最終更新</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {Object.values(currentStatusByUser).map((att) => (
                                        <tr key={att.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                <div className="font-bold text-gray-800">{att.users.display_name}</div>
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                {getStatusBadge(att.type)}
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                                                {formatTime(att.timestamp)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* 右側: 本日のシフト & 経費 */}
                <div className="space-y-6">
                    {/* 本日のシフト */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-5 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                            <h2 className="font-bold text-gray-700 flex items-center gap-2">
                                <MapPin className="text-blue-500" size={18} />
                                本日の予定シフト
                            </h2>
                            <span className="text-xs font-bold text-gray-400">{todayStr}</span>
                        </div>
                        <div className="p-5 space-y-3">
                            {todaysShifts.length === 0 ? (
                                <div className="text-center text-sm font-bold text-gray-400 py-4">本日のシフトはありません</div>
                            ) : (
                                todaysShifts.map(s => {
                                    const late = isShiftLate(s);
                                    return (
                                        <div key={s.id} className={`flex justify-between items-center rounded-xl p-3 border ${late ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
                                            <div className="flex gap-3 items-center">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                                    {s.users.display_name.substring(0, 1)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-gray-800 text-sm">{s.users.display_name}</p>
                                                        {late && (
                                                            <span className="flex items-center gap-1 bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold animate-pulse">
                                                                <AlertTriangle size={10} /> 未打刻・遅刻
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-500 font-medium">{s.location}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-gray-700 text-sm">
                                                    {s.start_time.substring(0, 5)} - {s.end_time.substring(0, 5)}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* 最新の交通費申請 */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-5 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                            <h2 className="font-bold text-gray-700 flex items-center gap-2">
                                <Receipt className="text-purple-500" size={18} />
                                最新の交通費申請
                            </h2>
                        </div>
                        <div className="p-0">
                            {expenses.length === 0 ? (
                                <div className="p-8 text-center text-sm font-bold text-gray-400">今月の申請はありません</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wider">
                                                <th className="px-5 py-2 font-semibold">スタッフ</th>
                                                <th className="px-5 py-2 font-semibold">経路</th>
                                                <th className="px-5 py-2 font-semibold text-right">金額</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {expenses.slice(0, 5).map((exp: AdminExpense) => (
                                                <tr key={exp.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-5 py-3 whitespace-nowrap">
                                                        <div className="font-bold text-gray-800 text-sm">{exp.users.display_name}</div>
                                                        <div className="text-[10px] text-gray-400">{exp.target_date}</div>
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <div className="text-xs font-bold text-gray-700">{exp.departure} <span className="text-gray-400">→</span> {exp.arrival}</div>
                                                        <div className="text-[10px] text-gray-500">{exp.transport_type} {exp.is_round_trip ? '(往復)' : ''}</div>
                                                    </td>
                                                    <td className="px-5 py-3 whitespace-nowrap text-right font-bold text-gray-800 text-sm">
                                                        ¥{exp.amount.toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 承認待ちの希望休 */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-5 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                            <h2 className="font-bold text-gray-700 flex items-center gap-2">
                                <CalendarOff className="text-rose-500" size={18} />
                                承認待ちの希望休
                            </h2>
                            {pendingHolidays.length > 0 && (
                                <span className="bg-rose-100 text-rose-600 px-2.5 py-0.5 rounded-full text-xs font-bold">
                                    {pendingHolidays.length}件
                                </span>
                            )}
                        </div>
                        <div className="p-0">
                            {pendingHolidays.length === 0 ? (
                                <div className="p-8 text-center text-sm font-bold text-gray-400">現在、承認待ちの希望休はありません</div>
                            ) : (
                                <div className="divide-y divide-gray-50">
                                    {pendingHolidays.map((holiday) => (
                                        <div key={holiday.id} className="p-5 hover:bg-gray-50/50 transition-colors">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold text-gray-800">{holiday.users?.display_name}</span>
                                                        <span className="text-xs text-gray-500 font-medium">さんの申請</span>
                                                    </div>
                                                    <div className="font-bold text-rose-600/90 text-sm">
                                                        {new Date(holiday.date).toLocaleDateString('ja-JP')}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[10px] text-gray-400">
                                                        申請日: {new Date(holiday.created_at).toLocaleDateString('ja-JP')}
                                                    </div>
                                                </div>
                                            </div>
                                            {holiday.reason && (
                                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 mb-4 text-sm text-gray-600 font-medium">
                                                    {holiday.reason}
                                                </div>
                                            )}
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => handleHolidayAction(holiday.id, 'REJECTED')}
                                                    disabled={actionLoading === holiday.id}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-gray-100 text-gray-500 font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                                                >
                                                    <XCircle size={16} /> 却下
                                                </button>
                                                <button
                                                    onClick={() => handleHolidayAction(holiday.id, 'APPROVED')}
                                                    disabled={actionLoading === holiday.id}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors shadow-sm shadow-emerald-200 disabled:opacity-50"
                                                >
                                                    {actionLoading === holiday.id ? (
                                                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                                                    ) : (
                                                        <><CheckCircle size={16} /> 承認</>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
