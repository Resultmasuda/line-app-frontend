"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Home, CalendarClock, Receipt, Settings, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useLiff } from '@/components/LiffProvider';
import { getMonthlyShifts, ShiftRecord } from '@/lib/api/shift';

export default function ShiftSchedule() {
    const { user, loading: liffLoading } = useLiff();

    const [currentDate, setCurrentDate] = useState(new Date());
    const [shifts, setShifts] = useState<ShiftRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchShifts = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);

        const yearMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        const res = await getMonthlyShifts(user.id, yearMonth);

        if (res.success && res.data) {
            setShifts(res.data);
        } else {
            console.error("Failed to fetch shifts");
        }
        setIsLoading(false);
    }, [user, currentDate]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchShifts();
    }, [fetchShifts]);

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const days = ["日", "月", "火", "水", "木", "金", "土"];
    const currentMonthStr = `${currentDate.getFullYear()}年 ${currentDate.getMonth() + 1}月`;
    const todayStr = new Date().toISOString().split('T')[0];

    // カレンダー描画用ロジック
    const renderCalendarDays = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDay = new Date(year, month, 1).getDay(); // 1日の曜日 (0-6)
        const daysInMonth = new Date(year, month + 1, 0).getDate(); // 当月の日数

        const cells = [];

        // 空白セル
        for (let i = 0; i < firstDay; i++) {
            cells.push(<div key={`empty-${i}`} className="p-2 border-b border-r border-gray-100 bg-gray-50/50"></div>);
        }

        // 日付セル
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;

            // この日のシフトを探す
            const dayShift = shifts.find(s => s.date === dateStr);
            const hasShift = !!dayShift;

            // 過去かどうか（簡易判定）
            const isPast = dateStr < todayStr;

            cells.push(
                <div key={dateStr} className={`p-1 border-b border-r border-gray-100 h-20 ${isToday ? 'bg-emerald-50/30' : 'bg-white'}`}>
                    <div className="flex justify-between items-start">
                        <span className={`text-xs font-semibold ${isToday ? 'bg-emerald-500 text-white w-5 h-5 rounded-full flex items-center justify-center' : 'text-gray-700 p-1'}`}>
                            {d}
                        </span>
                        {hasShift && (
                            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 mr-1 ${isPast ? 'bg-gray-400' : 'bg-emerald-500'}`}></div>
                        )}
                    </div>

                    {hasShift && dayShift && (
                        <div className="mt-1 flex flex-col gap-0.5">
                            <div className={`text-[9px] font-bold px-1 py-0.5 rounded flex items-center gap-0.5 truncate
                ${isPast ? 'bg-gray-100 text-gray-500' : 'bg-emerald-100/50 text-emerald-700'}`}>
                                {dayShift.location}
                            </div>
                            <div className={`text-[8px] px-1 truncate ${isPast ? 'text-gray-400' : 'text-emerald-600 font-medium'}`}>
                                {dayShift.start_time.substring(0, 5)}-{dayShift.end_time.substring(0, 5)}
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        return cells;
    };

    // 近日中の予定 (今日以降のシフト)
    const upcomingShifts = shifts.filter(s => s.date >= todayStr).slice(0, 3);

    if (liffLoading) {
        return <div className="flex h-screen items-center justify-center bg-gray-50 pb-20"><div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div></div>;
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50 pb-20 relative">
            {/* 画面ヘッダー */}
            <div className="bg-white px-5 pt-10 pb-4 shadow-sm z-10 sticky top-0">
                <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <CalendarClock className="text-emerald-500" size={22} />
                    シフト確認
                </h1>
            </div>

            <div className="flex-1 overflow-y-auto z-0">
                {/* カレンダーヘッダー */}
                <div className="bg-white px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                    <button onClick={prevMonth} className="p-1.5 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-500">
                        <ChevronLeft size={20} />
                    </button>
                    <span className="font-bold text-gray-800 text-lg">{currentMonthStr}</span>
                    <button onClick={nextMonth} className="p-1.5 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-500">
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* 曜日表示 */}
                <div className="grid grid-cols-7 bg-white border-b border-gray-100">
                    {days.map((day, i) => (
                        <div key={day} className={`py-2 text-center text-xs font-bold
              ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'}
            `}>
                            {day}
                        </div>
                    ))}
                </div>

                {/* カレンダー本体 */}
                <div className="bg-white border-l border-gray-100 relative min-h-[160px]">
                    {isLoading ? (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
                            <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
                        </div>
                    ) : null}
                    <div className="grid grid-cols-7">
                        {renderCalendarDays()}
                    </div>
                </div>

                {/* 詳細リスト表示 */}
                <div className="p-5 mt-2">
                    <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <MapPin size={16} className="text-emerald-500" /> 近日中の予定
                    </h2>

                    {upcomingShifts.length === 0 ? (
                        <div className="text-center py-6 text-gray-400 text-sm bg-white rounded-xl shadow-sm border border-gray-100">
                            近日中のシフトはありません
                        </div>
                    ) : (
                        upcomingShifts.map((shift) => {
                            const d = new Date(shift.date);
                            const isToday = shift.date === todayStr;
                            return (
                                <div key={shift.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-3">
                                    <div className="flex justify-between items-center border-b border-gray-50 pb-3 mb-3">
                                        <span className="font-bold tracking-wide text-gray-800">
                                            {d.getMonth() + 1}月{d.getDate()}日 <span className="text-xs font-normal text-gray-500">({days[d.getDay()]})</span>
                                        </span>
                                        {isToday && (
                                            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-1 rounded-md">TODAY</span>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="font-bold text-gray-800 text-lg">{shift.location}</p>
                                            <p className="text-gray-500 text-sm mt-1">{shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* フローティングボトムナビゲーション */}
            <div className="fixed bottom-0 w-full max-w-md bg-white/95 backdrop-blur-md border-t border-gray-100 px-6 pt-3 pb-8 flex justify-between items-center shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-50">
                <Link href="/" className="flex flex-col items-center text-gray-400 hover:text-emerald-500 transition-all active:scale-95">
                    <Home size={24} strokeWidth={2} />
                    <span className="text-[10px] mt-1.5 font-semibold">ホーム</span>
                </Link>
                <Link href="/shift" className="flex flex-col items-center text-emerald-600 transition-transform active:scale-95">
                    <CalendarClock size={24} strokeWidth={2.5} />
                    <span className="text-[10px] mt-1.5 font-bold">シフト</span>
                </Link>
                <Link href="/expense" className="flex flex-col items-center text-gray-400 hover:text-emerald-500 transition-all active:scale-95">
                    <Receipt size={24} strokeWidth={2} />
                    <span className="text-[10px] mt-1.5 font-semibold">交通費</span>
                </Link>
            </div>
        </div>
    );
}
