"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, CalendarClock, Clock, Sun, Navigation, Building2, LayoutGrid, ArrowLeft } from 'lucide-react';
import { getAllShifts, getAllAttendances, getAllStores, StoreRecord, getAllUsers, AdminUserRecord } from '@/lib/api/admin';

type ShiftRecord = {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    location: string;
    users?: { display_name: string };
    user_id: string;
};

type AttendanceRecord = {
    id: string;
    user_id: string;
    date: string;
    type: 'WAKE_UP' | 'LEAVE' | 'CLOCK_IN' | 'CLOCK_OUT';
    timestamp: string;
};

export default function StoreShiftsPage() {
    const params = useParams();
    const router = useRouter();
    const storeId = params.storeId as string;

    const [currentDate, setCurrentDate] = useState(new Date());
    const [store, setStore] = useState<StoreRecord | null>(null);
    const [shifts, setShifts] = useState<ShiftRecord[]>([]);
    const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const ym = `${year}-${month}`;

            const [storeRes, shiftRes, attRes] = await Promise.all([
                getAllStores(),
                getAllShifts(ym),
                getAllAttendances(ym)
            ]);

            if (storeRes.success && storeRes.data) {
                const foundStore = storeRes.data.find(s => s.id === storeId);
                setStore(foundStore || null);

                if (foundStore && shiftRes.success && shiftRes.data) {
                    const storeShifts = shiftRes.data.filter(s => s.location === foundStore.name)
                        .sort((a, b) => new Date(`${a.date}T${a.start_time}`).getTime() - new Date(`${b.date}T${b.start_time}`).getTime());
                    setShifts(storeShifts);
                } else {
                    setShifts([]);
                }
            }

            if (attRes.success && attRes.data) {
                setAttendances(attRes.data);
            } else {
                setAttendances([]);
            }

            setIsLoading(false);
        }
        fetchData();
    }, [currentDate, storeId]);

    const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const getShiftAttendances = (userId: string, date: string) => {
        return attendances.filter(a => a.user_id === userId && a.date === date);
    };

    if (isLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (!store) {
        return (
            <div className="text-center py-20 text-gray-500">
                店舗情報が見つかりませんでした。<br />
                <button onClick={() => router.back()} className="text-emerald-500 underline mt-4">戻る</button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-6xl">
            {/* ヘッダー */}
            <div className="flex items-center gap-4 mb-2">
                <button
                    onClick={() => router.push('/admin/shifts')}
                    className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                >
                    <ArrowLeft size={20} className="text-gray-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <Building2 className="text-indigo-500" />
                        {store.name} のシフト管理
                    </h1>
                    <p className="text-xs text-gray-500 font-bold mt-1">選択された店舗に紐づく1ヶ月のシフト一覧</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={handlePrevMonth} className="px-3 py-1.5 text-gray-500 bg-gray-50 rounded-lg font-bold hover:bg-gray-100">先月</button>
                    <span className="font-black text-xl text-gray-800 tracking-tight w-36 text-center">
                        {currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月
                    </span>
                    <button onClick={handleNextMonth} className="px-3 py-1.5 text-gray-500 bg-gray-50 rounded-lg font-bold hover:bg-gray-100">翌月</button>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={() => router.push(`/admin/shifts/${store.id}/builder`)}
                        className="flex-1 md:flex-none justify-center flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-md hover:bg-emerald-600 transition-all hover:scale-105 active:scale-95"
                    >
                        <LayoutGrid size={18} />
                        アドバンスド・シフトビルダーを開く
                    </button>
                </div>
            </div>

            {/* シフト一覧テーブル */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                    <h2 className="font-bold text-gray-700 flex items-center gap-2">
                        <CalendarClock size={16} className="text-emerald-500" />
                        月間シフト一覧
                    </h2>
                    <span className="text-xs font-bold text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                        計 {shifts.length} シフト
                    </span>
                </div>

                {shifts.length === 0 ? (
                    <div className="py-20 text-center text-gray-400 font-bold">
                        この月のシフトはまだ登録されていません
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 text-gray-500 text-[11px] uppercase tracking-wider">
                                    <th className="px-6 py-3 font-semibold border-b border-gray-100 w-32">日付</th>
                                    <th className="px-6 py-3 font-semibold border-b border-gray-100 w-48">スタッフ名</th>
                                    <th className="px-6 py-3 font-semibold border-b border-gray-100 w-40">時間</th>
                                    <th className="px-6 py-3 font-semibold border-b border-gray-100">出退勤状況</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {shifts.map((shift) => {
                                    const dateStr = new Date(shift.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' });
                                    const atts = getShiftAttendances(shift.user_id, shift.date);

                                    const clockIn = atts.find(a => a.type === 'CLOCK_IN');
                                    const clockOut = atts.find(a => a.type === 'CLOCK_OUT');
                                    const wakeUp = atts.find(a => a.type === 'WAKE_UP');
                                    const leave = atts.find(a => a.type === 'LEAVE');
                                    const isFuture = new Date(shift.date) > new Date();

                                    return (
                                        <tr key={shift.id} className="group hover:bg-emerald-50/30 transition-colors">
                                            <td className="px-6 py-4 text-sm font-bold text-gray-700">
                                                {dateStr}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-[10px]">
                                                        {(shift.users?.display_name || '不').slice(0, 2).toUpperCase()}
                                                    </div>
                                                    <span className="font-bold text-gray-800 text-sm">{shift.users?.display_name || '不明'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-bold text-gray-600 flex items-center gap-1.5">
                                                    <Clock size={14} className="text-emerald-400" />
                                                    {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {isFuture ? (
                                                        <span className="text-[11px] font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                                                            予定
                                                        </span>
                                                    ) : clockIn || wakeUp || leave || clockOut ? (
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2">
                                                                {wakeUp ? (
                                                                    <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 flex items-center"><Sun size={10} className="mr-1" />起床 {new Date(wakeUp.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                                                                ) : <span className="text-[10px] text-gray-300">起床未</span>}
                                                                {leave ? (
                                                                    <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 flex items-center"><Navigation size={10} className="mr-1" />出発 {new Date(leave.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                                                                ) : <span className="text-[10px] text-gray-300">出発未</span>}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-sm">
                                                                {clockIn ? (
                                                                    <span className="font-bold text-emerald-600">{new Date(clockIn.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                                                                ) : <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">未出勤</span>}
                                                                <span className="text-gray-300">〜</span>
                                                                {clockOut ? (
                                                                    <span className="font-bold text-blue-600">{new Date(clockOut.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                                                                ) : clockIn ? (
                                                                    <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">未退勤</span>
                                                                ) : <span className="text-[10px] font-bold text-gray-300">未定</span>}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[11px] font-bold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full">
                                                            出勤記録なし
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
