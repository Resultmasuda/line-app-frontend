"use client";
import React, { useState, useEffect } from 'react';
import { getTodayAllAttendances, getAllExpenses, getAllShifts, getPendingHolidayRequests, updateHolidayRequestStatus } from '@/lib/api/admin';
import { Play, Square, Sun, Navigation, MapPin, Receipt, Clock, AlertTriangle, CheckCircle, XCircle, CalendarOff, Bookmark } from 'lucide-react';

interface BaseAdminRecord {
    id: string;
    users: { display_name: string };
}
interface AdminAttendance extends BaseAdminRecord {
    type: string;
    timestamp: string;
    latitude?: number | null;
    longitude?: number | null;
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
    planned_wake_up_time?: string | null;
    planned_leave_time?: string | null;
    daily_memo?: string | null;
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
            try {
                const { getTodayJST, getCurrentMonthJST } = await import('@/lib/utils/date');
                const today = getTodayJST();
                const thisMonth = getCurrentMonthJST();

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

        // リアルタイム更新の購読
        const { supabase } = require('@/lib/supabase');
        const channel = supabase
            .channel('dashboard_updates')
            .on('postgres_changes', { event: '*', table: 'attendances', schema: 'public' }, () => {
                fetchDashboardData();
            })
            .on('postgres_changes', { event: '*', table: 'shifts', schema: 'public' }, () => {
                fetchDashboardData();
            })
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, []);

    if (isLoading) {
        return (
            <div className="h-64 flex items-center justify-center">
                <div className="animate-spin w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full shadow-lg"></div>
            </div>
        );
    }

    const now = new Date();
    const todayStr = now.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
    const todaysShifts = shifts.filter(s => s.date === todayStr);

    // 簡易的な現在のステータス算出 (最後の打刻で判定)
    const currentStatusByUser: Record<string, AdminAttendance> = {};
    attendances.forEach(a => {
        currentStatusByUser[a.users.display_name] = a;
    });

    const getStatusBadge = (type: string) => {
        switch (type) {
            case 'WAKE_UP': return <span className="bg-purple-50 text-purple-600 font-black px-2.5 py-1 rounded-lg text-[10px] flex items-center gap-1 w-fit border border-purple-100 uppercase tracking-wider"><Sun size={12} strokeWidth={3} /> 起床済</span>;
            case 'LEAVE': return <span className="bg-cyan-50 text-cyan-600 font-black px-2.5 py-1 rounded-lg text-[10px] flex items-center gap-1 w-fit border border-cyan-100 uppercase tracking-wider"><Navigation size={12} strokeWidth={3} /> 移動中</span>;
            case 'CLOCK_IN': return <span className="bg-emerald-50 text-emerald-600 font-black px-2.5 py-1 rounded-lg text-[10px] flex items-center gap-1 w-fit border border-emerald-100 uppercase tracking-wider"><Play size={12} strokeWidth={3} /> 勤務中</span>;
            case 'CLOCK_OUT': return <span className="bg-slate-100 text-slate-500 font-black px-2.5 py-1 rounded-lg text-[10px] flex items-center gap-1 w-fit border border-slate-200 uppercase tracking-wider"><Square size={12} strokeWidth={3} /> 退勤済</span>;
            default: return <span className="bg-slate-100 text-slate-400 font-black px-2.5 py-1 rounded-lg text-[10px] border border-slate-200 uppercase tracking-wider">未稼働</span>;
        }
    };

    const formatTime = (isoString?: string) => {
        if (!isoString) return '--:--';
        const d = new Date(isoString);
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    };

    // const now = new Date(); // redundant
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
        <div className="space-y-8 pb-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-slate-200 pb-6 mb-2 gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tighter">本日のサマリー</h1>
                    <p className="text-[10px] sm:text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest flex items-center gap-2">
                        <Bookmark size={14} className="text-brand-gold" /> デイリー稼働・実績概要
                    </p>
                </div>
                <div className="text-right ml-auto sm:ml-0">
                    <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">最終更新</p>
                    <p className="text-lg font-black text-brand-blue">{formatTime(now.toISOString())}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* 左側: 本日の出勤状況 */}
                <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                        <h2 className="font-black text-slate-700 flex items-center gap-3">
                            <div className="p-2 bg-emerald-50 text-emerald-500 rounded-xl shadow-inner">
                                <Clock size={20} strokeWidth={2.5} />
                            </div>
                            リアルタイム稼働状況 <span className="px-3 py-1 bg-white border border-slate-100 rounded-full text-xs text-slate-400 ml-2 shadow-sm font-black">{Object.keys(currentStatusByUser).length}名</span>
                        </h2>
                    </div>
                    <div className="p-0">
                        {Object.keys(currentStatusByUser).length === 0 ? (
                            <div className="p-8 text-center text-sm font-bold text-gray-400">本日の打刻データはありません</div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 text-slate-400 text-[10px] uppercase tracking-widest">
                                        <th className="px-6 py-4 font-black">スタッフ</th>
                                        <th className="px-6 py-4 font-black">状態</th>
                                        <th className="px-6 py-4 font-black">更新時間</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 text-[13px]">
                                    {Object.values(currentStatusByUser).map((att) => (
                                        <tr key={att.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-4 min-w-[100px]">
                                                <div className="font-bold text-gray-800 leading-tight break-all">{att.users.display_name}</div>
                                            </td>
                                            <td className="px-4 py-4">
                                                {getStatusBadge(att.type)}
                                            </td>
                                            <td className="px-4 py-4 text-gray-500 font-medium">
                                                <div className="flex items-center gap-2">
                                                    {formatTime(att.timestamp)}
                                                    {att.latitude && att.longitude && (
                                                        <a
                                                            href={`https://maps.google.com/?q=${att.latitude},${att.longitude}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-blue-500 p-1.5 rounded-md transition-colors shadow-sm"
                                                            title="打刻時の位置情報を確認"
                                                        >
                                                            <MapPin size={14} />
                                                        </a>
                                                    )}
                                                </div>
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
                    <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                            <h2 className="font-black text-slate-700 flex items-center gap-3">
                                <div className="p-2 bg-brand-blue/10 text-brand-blue rounded-xl shadow-inner">
                                    <MapPin size={20} strokeWidth={2.5} />
                                </div>
                                本日の予定シフト
                            </h2>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{todayStr}</span>
                        </div>
                        <div className="p-5 space-y-3">
                            {todaysShifts.length === 0 ? (
                                <div className="text-center text-sm font-bold text-gray-400 py-4">本日のシフトはありません</div>
                            ) : (
                                todaysShifts.map(s => {
                                    const late = isShiftLate(s);
                                    return (
                                        <div key={s.id} className={`flex justify-between items-center rounded-2xl p-4 border transition-all hover:scale-[1.01] ${late ? 'bg-rose-50 border-rose-100 shadow-lg shadow-rose-200/20' : 'bg-slate-50 border-slate-100 shadow-sm'}`}>
                                            <div className="flex gap-4 items-center">
                                                <div className="w-10 h-10 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center font-black text-sm shadow-inner group-hover:scale-110 transition-transform">
                                                    {s.users.display_name.substring(0, 1)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="font-bold text-gray-800 text-sm">{s.users.display_name}</p>
                                                        {late && (
                                                            <span className="flex items-center gap-1 bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold animate-pulse">
                                                                <AlertTriangle size={10} /> 未打刻・遅刻
                                                            </span>
                                                        )}
                                                        {s.planned_wake_up_time && (
                                                            <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                                                                起床 {s.planned_wake_up_time.substring(0, 5)}
                                                            </span>
                                                        )}
                                                        {s.planned_leave_time && (
                                                            <span className="text-[10px] font-bold text-cyan-600 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-100">
                                                                出発 {s.planned_leave_time.substring(0, 5)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-500 font-medium mt-0.5">{s.location}</p>
                                                    {s.daily_memo && (
                                                        <p className="text-[10px] text-gray-600 mt-1.5 bg-white p-1.5 rounded border border-gray-100 line-clamp-6 shadow-sm break-words whitespace-pre-wrap">
                                                            {s.daily_memo}
                                                        </p>
                                                    )}
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
                    <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                            <h2 className="font-black text-slate-700 flex items-center gap-3">
                                <div className="p-2 bg-brand-gold/10 text-brand-gold rounded-xl shadow-inner">
                                    <Receipt size={20} strokeWidth={2.5} />
                                </div>
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
                                                    <td className="px-5 py-3 min-w-[100px]">
                                                        <div className="font-bold text-gray-800 text-sm whitespace-normal break-all">{exp.users.display_name}</div>
                                                        <div className="text-[10px] text-gray-400">{exp.target_date}</div>
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <div className="text-xs font-bold text-gray-700 leading-tight whitespace-normal break-all">
                                                            {exp.departure} 
                                                            {exp.transport_type !== 'HOTEL' && <><span className="text-gray-300 mx-1">→</span> {exp.arrival}</>}
                                                        </div>
                                                        <div className="flex gap-1.5 mt-1">
                                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-lg border uppercase tracking-tighter ${
                                                                exp.transport_type === 'HOTEL' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                                                exp.transport_type === 'COMMUTER_PASS' ? 'bg-brand-gold/10 text-brand-gold border-brand-gold/30' :
                                                                exp.transport_type === 'COMMUTER_USE' ? 'bg-cyan-50 text-cyan-600 border-cyan-100' :
                                                                'bg-slate-100 text-slate-500 border-slate-200'
                                                            }`}>
                                                                {exp.transport_type === 'HOTEL' ? '宿泊' : 
                                                                 exp.transport_type === 'COMMUTER_PASS' ? '定期券' : 
                                                                 exp.transport_type === 'COMMUTER_USE' ? '定期利用' : 
                                                                 exp.transport_type === 'TRAIN' ? '電車' : 'バス'}
                                                            </span>
                                                            {exp.transport_type !== 'HOTEL' && exp.transport_type !== 'COMMUTER_PASS' && exp.transport_type !== 'COMMUTER_USE' && (
                                                                <span className="text-[9px] font-bold bg-gray-50 text-gray-400 px-1 py-0.5 rounded">
                                                                    {exp.is_round_trip ? '往復' : '片道'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3 whitespace-nowrap text-right font-black text-gray-900 text-sm">
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
                    <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                            <h2 className="font-black text-slate-700 flex items-center gap-3">
                                <div className="p-2 bg-rose-50 text-rose-500 rounded-xl shadow-inner">
                                    <CalendarOff size={20} strokeWidth={2.5} />
                                </div>
                                承認待ちの希望休
                            </h2>
                            {pendingHolidays.length > 0 && (
                                <span className="bg-rose-500 text-white px-3 py-1 rounded-full text-[10px] font-black shadow-lg shadow-rose-200 shadow-inner">
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
                                            <div className="flex gap-4">
                                                <button
                                                    onClick={() => handleHolidayAction(holiday.id, 'REJECTED')}
                                                    disabled={actionLoading === holiday.id}
                                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all active:scale-95 disabled:opacity-50 text-xs uppercase tracking-widest"
                                                >
                                                    <XCircle size={16} strokeWidth={3} /> 却下
                                                </button>
                                                <button
                                                    onClick={() => handleHolidayAction(holiday.id, 'APPROVED')}
                                                    disabled={actionLoading === holiday.id}
                                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-brand-blue text-white font-black rounded-2xl hover:bg-brand-deep-blue transition-all active:scale-95 shadow-lg shadow-brand-blue/20 disabled:opacity-50 text-xs uppercase tracking-widest"
                                                >
                                                    {actionLoading === holiday.id ? (
                                                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                                                    ) : (
                                                        <><CheckCircle size={16} strokeWidth={3} /> 承認</>
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
