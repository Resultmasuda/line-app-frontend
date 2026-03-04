"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Home, CalendarClock, Receipt, Settings, ChevronLeft, ChevronRight, MapPin, CalendarPlus, Edit3, Trash2, X, FileText } from 'lucide-react';
import Link from 'next/link';
import { useLiff } from '@/components/LiffProvider';
import {
    getMonthlyShifts, ShiftRecord, getHolidayRequests, createHolidayRequest,
    HolidayRequest, updateShiftPlanning, getGroupMonthlyShifts
} from '@/lib/api/shift';
import { createShift, updateShift, deleteShift, getAllStores, getAllUsers } from '@/lib/api/admin';
import { List, User as UserIcon, Users } from 'lucide-react';
import { AdminUserRecord } from '@/lib/api/admin';

// ユーザーデータの型定義 (LiffProviderと合わせる)
type AppUser = {
    id: string;
    line_user_id: string;
    display_name: string;
    role: string;
};

export default function ShiftSchedule() {
    const { user, loading: liffLoading } = useLiff();

    const [currentDate, setCurrentDate] = useState(new Date());
    const [shifts, setShifts] = useState<ShiftRecord[]>([]);
    const [holidays, setHolidays] = useState<HolidayRequest[]>([]);
    const [stores, setStores] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modals
    const [showHolidayModal, setShowHolidayModal] = useState(false);
    const [showDayModal, setShowDayModal] = useState(false);
    const [showShiftEditModal, setShowShiftEditModal] = useState(false);
    const [showShiftDetailModal, setShowShiftDetailModal] = useState(false);

    // Selected Data
    const [selectedDateStr, setSelectedDateStr] = useState('');
    const [selectedShift, setSelectedShift] = useState<ShiftRecord | null>(null);
    const [targetUser, setTargetUser] = useState<AppUser | AdminUserRecord | null>(null);
    const [allUsers, setAllUsers] = useState<AdminUserRecord[]>([]);
    const [showCalendarList, setShowCalendarList] = useState(false);
    const [selectedGroupRole, setSelectedGroupRole] = useState<string | null>(null);

    // Forms
    const [shiftFormData, setShiftFormData] = useState({
        location: '',
        start_time: '10:00',
        end_time: '19:00',
        shift_type: 'work',
        planned_wake_up_time: '',
        planned_leave_time: '',
        daily_memo: ''
    });
    const [holidayDate, setHolidayDate] = useState(new Date().toISOString().split('T')[0]);
    const [holidayReason, setHolidayReason] = useState('');

    const [submitLoading, setSubmitLoading] = useState(false);

    const fetchShifts = useCallback(async () => {
        setIsLoading(true);
        const yearMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

        try {
            // グループまとめ表示モード
            if (selectedGroupRole) {
                const groupUserIds = allUsers
                    .filter(u => u.role.toUpperCase() === selectedGroupRole)
                    .map(u => u.id);
                // 自分も同じロールなら追加
                if (user && user.role.toUpperCase() === selectedGroupRole && !groupUserIds.includes(user.id)) {
                    groupUserIds.push(user.id);
                }

                if (groupUserIds.length > 0) {
                    const shiftRes = await getGroupMonthlyShifts(groupUserIds, yearMonth);
                    if (shiftRes.success && shiftRes.data) {
                        // display_name をスタッフ名としてlocationに付加して表示
                        const enriched = shiftRes.data.map((s: any) => ({
                            ...s,
                            location: `${(s.users as any)?.display_name || '?'} - ${s.location}`,
                        }));
                        setShifts(enriched);
                    }
                }
                setHolidays([]);
            } else {
                // 個別ユーザーモード
                const userId = targetUser?.id || user?.id;
                if (!userId) { setIsLoading(false); return; }

                const [shiftRes, holidayRes] = await Promise.all([
                    getMonthlyShifts(userId, yearMonth),
                    getHolidayRequests(userId, yearMonth)
                ]);

                if (shiftRes.success && shiftRes.data) {
                    setShifts(shiftRes.data);
                }
                if (holidayRes.success && holidayRes.data) {
                    setHolidays(holidayRes.data);
                }
            }
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [user, targetUser, currentDate, selectedGroupRole, allUsers]);

    useEffect(() => {
        if (user && !targetUser) setTargetUser(user);
    }, [user, targetUser]);

    useEffect(() => {
        fetchShifts();
    }, [fetchShifts]);

    useEffect(() => {
        const loadInitialData = async () => {
            const [storesRes, usersRes] = await Promise.all([
                getAllStores(),
                getAllUsers()
            ]);
            if (storesRes.success) setStores(storesRes.data);
            if (usersRes.success) setAllUsers(usersRes.data);
        };
        loadInitialData();
    }, []);

    const handleHolidaySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setSubmitLoading(true);
        const res = await createHolidayRequest({
            user_id: user.id,
            date: holidayDate,
            reason: holidayReason || null
        });

        if (res.success) {
            setShowHolidayModal(false);
            setHolidayReason('');
            fetchShifts();
        } else {
            alert('申請に失敗しました');
        }
        setSubmitLoading(false);
    };

    const handleDayClick = (dateStr: string, shift?: ShiftRecord) => {
        setSelectedDateStr(dateStr);
        setSelectedShift(shift || null);
        setShowDayModal(true);
    };

    const openShiftEditModal = () => {
        if (selectedShift) {
            setShiftFormData({
                location: selectedShift.location,
                start_time: selectedShift.start_time.substring(0, 5),
                end_time: selectedShift.end_time.substring(0, 5),
                shift_type: selectedShift.shift_type || 'work',
                planned_wake_up_time: selectedShift.planned_wake_up_time?.substring(0, 5) || '',
                planned_leave_time: selectedShift.planned_leave_time?.substring(0, 5) || '',
                daily_memo: selectedShift.daily_memo || ''
            });
        } else {
            setShiftFormData({
                location: '',
                start_time: '10:00',
                end_time: '19:00',
                shift_type: 'plan', // デフォルトは個人予定
                planned_wake_up_time: '',
                planned_leave_time: '',
                daily_memo: ''
            });
        }
        setShowDayModal(false);
        setShowShiftEditModal(true);
    };

    const handleSaveShift = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setSubmitLoading(true);

        const isWork = shiftFormData.shift_type === 'work';

        const payload: any = {
            user_id: user.id,
            date: selectedDateStr,
            location: shiftFormData.location,
            start_time: shiftFormData.start_time.length === 5 ? `${shiftFormData.start_time}:00` : shiftFormData.start_time,
            end_time: shiftFormData.end_time.length === 5 ? `${shiftFormData.end_time}:00` : shiftFormData.end_time,
            shift_type: shiftFormData.shift_type,
            status: 'published',
            planned_wake_up_time: shiftFormData.planned_wake_up_time ? `${shiftFormData.planned_wake_up_time}:00` : null,
            planned_leave_time: shiftFormData.planned_leave_time ? `${shiftFormData.planned_leave_time}:00` : null,
            daily_memo: shiftFormData.daily_memo || null
        };

        let res;
        if (selectedShift) {
            // 勤務(work)の場合は、予定項目のみ更新する
            if (isWork) {
                res = await updateShiftPlanning(selectedShift.id, {
                    planned_wake_up_time: payload.planned_wake_up_time,
                    planned_leave_time: payload.planned_leave_time,
                    daily_memo: payload.daily_memo
                });
            } else {
                res = await updateShift(selectedShift.id, payload);
            }
        } else {
            res = await createShift(payload);
        }

        if (res.success) {
            setShowShiftEditModal(false);
            fetchShifts();
        } else {
            alert('保存に失敗しました');
        }
        setSubmitLoading(false);
    };

    const handleDeleteShift = async () => {
        if (!selectedShift || !confirm('この予定を削除しますか？')) return;
        setSubmitLoading(true);
        const res = await deleteShift(selectedShift.id);
        if (res.success) {
            setShowDayModal(false);
            fetchShifts();
        } else {
            alert('削除に失敗しました');
        }
        setSubmitLoading(false);
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const days = ["日", "月", "火", "水", "木", "金", "土"];
    const currentMonthStr = `${currentDate.getFullYear()}年 ${currentDate.getMonth() + 1}月`;
    const todayStr = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');

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

            const dayShift = shifts.find(s => s.date === dateStr);
            const hasShift = !!dayShift;

            const dayHoliday = holidays.find(h => h.date === dateStr);
            const hasHoliday = !!dayHoliday;

            const isPast = dateStr < todayStr;

            cells.push(
                <div
                    key={dateStr}
                    onClick={() => handleDayClick(dateStr, dayShift)}
                    className={`p-1 border-b border-r border-gray-100 h-20 shadow-inner transition-colors cursor-pointer active:bg-gray-100 ${isToday ? 'bg-emerald-50/30' : 'bg-white'} ${hasHoliday ? 'bg-amber-50/20' : ''}`}
                >
                    <div className="flex justify-between items-start">
                        <span className={`text-xs font-semibold ${isToday ? 'bg-emerald-500 text-white w-5 h-5 rounded-full flex items-center justify-center' : 'text-gray-700 p-1'}`}>
                            {d}
                        </span>
                        <div className="flex flex-col gap-1 items-end pt-1 mr-1">
                            {hasShift && (
                                <div className={`w-1.5 h-1.5 rounded-full ${isPast ? 'bg-gray-400' : 'bg-emerald-500'}`}></div>
                            )}
                            {hasHoliday && (
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></div>
                            )}
                        </div>
                    </div>

                    {hasHoliday && (
                        <div className="mt-0.5 px-1 py-0.5 bg-amber-100/50 text-amber-700 text-[8px] font-bold rounded truncate border border-amber-200/50">
                            希望休 ({dayHoliday.status === 'PENDING' ? '申請中' : dayHoliday.status === 'APPROVED' ? '承認' : '却下'})
                        </div>
                    )}

                    {hasShift && dayShift && (
                        <div className="mt-1 flex flex-col gap-1">
                            <div className={`text-[9px] font-black px-1.5 py-1 rounded-md flex items-center gap-1 shadow-sm border truncate
                                ${isPast ? 'bg-gray-100 text-gray-400 border-gray-200' :
                                    dayShift.shift_type === 'work' ? 'bg-emerald-500 text-white border-emerald-400' :
                                        dayShift.shift_type === 'plan' ? 'bg-indigo-500 text-white border-indigo-400' :
                                            'bg-amber-500 text-white border-amber-400'}`}>
                                {dayShift.location}
                            </div>
                            <div className={`text-[8px] font-black px-1 tracking-tighter truncate ${isPast ? 'text-gray-300' :
                                dayShift.shift_type === 'work' ? 'text-emerald-600' :
                                    dayShift.shift_type === 'plan' ? 'text-indigo-600' :
                                        'text-amber-600'}`}>
                                {dayShift.start_time.substring(0, 5)} - {dayShift.end_time.substring(0, 5)}
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        return cells;
    };

    const upcomingShifts = shifts.filter(s => s.date >= todayStr).slice(0, 3);

    if (liffLoading) {
        return <div className="flex h-screen items-center justify-center bg-gray-50 pb-20"><div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div></div>;
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50 pb-20 relative">
            {/* 画面ヘッダー */}
            <div className="bg-white px-5 pt-10 pb-4 shadow-sm z-10 sticky top-0 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowCalendarList(true)}
                        className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 transition-all border border-gray-100"
                    >
                        <List size={22} />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-gray-800 leading-tight">
                            {targetUser?.id === user?.id ? '自分のシフト' : `${targetUser?.display_name}さんのシフト`}
                        </h1>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-0.5">Shift & Schedule</p>
                    </div>
                </div>
                <button
                    onClick={() => { setHolidayDate(todayStr); setShowHolidayModal(true); }}
                    className="text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200 px-3 py-1.5 rounded-full hover:bg-amber-100 transition-all flex items-center gap-1 shadow-sm active:scale-95"
                >
                    <span className="text-sm">✨</span> 希望休申請
                </button>
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

                {/* 近日中の予定 */}
                <div className="p-5 mt-2">
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <MapPin size={16} className="text-emerald-500" /> 近日中の予定
                        </h2>
                    </div>

                    {upcomingShifts.length === 0 ? (
                        <div className="text-center py-6 text-gray-400 text-sm bg-white rounded-xl shadow-sm border border-gray-100">
                            近日中のシフトはありません
                        </div>
                    ) : (
                        upcomingShifts.map((shift) => {
                            const d = new Date(shift.date);
                            const isToday = shift.date === todayStr;
                            return (
                                <div
                                    key={shift.id}
                                    onClick={() => handleDayClick(shift.date, shift)}
                                    className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-3 hover:border-emerald-200 active:bg-gray-50 transition-colors cursor-pointer"
                                >
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

            {/* --- Modals --- */}

            {/* Day Action Modal */}
            {showDayModal && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 font-sans" onClick={() => setShowDayModal(false)}>
                    <div className="bg-white w-full rounded-t-3xl p-6 shadow-2xl animate-in slide-in-from-bottom" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                            <h3 className="text-lg font-bold text-gray-800">
                                {selectedDateStr.split('-')[1]}月{selectedDateStr.split('-')[2]}日の予定
                            </h3>
                            <button onClick={() => setShowDayModal(false)} className="bg-gray-100 text-gray-500 p-2 rounded-full active:bg-gray-200">
                                <X size={18} />
                            </button>
                        </div>

                        {selectedShift ? (
                            <div className="space-y-4">
                                <div className={`border rounded-2xl p-4 ${selectedShift.shift_type === 'work' ? 'bg-emerald-50 border-emerald-100' :
                                    selectedShift.shift_type === 'plan' ? 'bg-indigo-50 border-indigo-100' :
                                        'bg-amber-50 border-amber-100'}`}>
                                    <div className={`font-bold mb-1 ${selectedShift.shift_type === 'work' ? 'text-emerald-800' :
                                        selectedShift.shift_type === 'plan' ? 'text-indigo-800' :
                                            'text-amber-800'}`}>{selectedShift.location}</div>
                                    <div className={`text-sm font-medium ${selectedShift.shift_type === 'work' ? 'text-emerald-600' :
                                        selectedShift.shift_type === 'plan' ? 'text-indigo-600' :
                                            'text-amber-600'}`}>
                                        {selectedShift.start_time.substring(0, 5)} - {selectedShift.end_time.substring(0, 5)}
                                    </div>
                                    {(selectedShift.planned_wake_up_time || selectedShift.daily_memo) && (
                                        <div className={`mt-3 pt-3 border-t text-xs space-y-1 ${selectedShift.shift_type === 'work' ? 'border-emerald-100/50 text-emerald-700' :
                                            selectedShift.shift_type === 'plan' ? 'border-indigo-100/50 text-indigo-700' :
                                                'border-amber-100/50 text-amber-700'}`}>
                                            {selectedShift.planned_wake_up_time && <p>⏰ 起床: {selectedShift.planned_wake_up_time.substring(0, 5)}</p>}
                                            {selectedShift.daily_memo && <p>📝 {selectedShift.daily_memo}</p>}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={openShiftEditModal} className="col-span-2 py-3.5 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-md">
                                        <Edit3 size={18} /> {selectedShift.shift_type === 'work' ? '予定・メモを編集' : '内容を編集'}
                                    </button>
                                    <button
                                        onClick={handleDeleteShift}
                                        disabled={submitLoading || selectedShift.shift_type === 'work'}
                                        className="col-span-2 py-3 bg-red-50 text-red-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 active:scale-[0.98] transition-all border border-red-200 disabled:opacity-30"
                                    >
                                        <Trash2 size={18} /> 予定を削除
                                    </button>
                                </div>
                                {selectedShift.shift_type === 'work' && (
                                    <p className="text-[10px] text-gray-400 text-center">※ 勤務シフトの場所と時間は管理者のみ編集可能です</p>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-center text-gray-500 text-sm py-4">この日の予定はありません</p>
                                <button onClick={openShiftEditModal} className="w-full py-4 bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-emerald-600 active:bg-emerald-700 active:scale-[0.98] transition-all">
                                    <CalendarPlus size={20} /> 新しい予定を登録する
                                </button>
                                <button onClick={() => { setHolidayDate(selectedDateStr); setShowHolidayModal(true); setShowDayModal(false); }} className="w-full py-3.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                                    <span>✨</span> 希望休を申請する
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showShiftEditModal && (
                <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowShiftEditModal(false)}>
                    <div className="bg-white w-full max-h-[90vh] rounded-t-3xl p-6 shadow-2xl animate-in slide-in-from-bottom overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-4 sticky top-0 bg-white z-10">
                            <h3 className="text-lg font-bold text-gray-800">
                                {selectedDateStr} の予定{selectedShift ? '編集' : '登録'}
                            </h3>
                            <button onClick={() => setShowShiftEditModal(false)} className="bg-gray-100 text-gray-500 p-2 rounded-full active:bg-gray-200">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveShift} className="space-y-5">
                            {/* シフト種別 (新規のみ) */}
                            {!selectedShift && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1.5 px-1 uppercase tracking-wider">種別</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setShiftFormData({ ...shiftFormData, shift_type: 'plan' })}
                                            className={`py-2 rounded-xl text-xs font-bold border transition-all ${shiftFormData.shift_type === 'plan' ? 'bg-blue-500 text-white border-blue-500' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                                        >
                                            個人の予定
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShiftFormData({ ...shiftFormData, shift_type: 'other' })}
                                            className={`py-2 rounded-xl text-xs font-bold border transition-all ${shiftFormData.shift_type === 'other' ? 'bg-amber-500 text-white border-amber-500' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                                        >
                                            その他・打合せ
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1.5 px-1 uppercase tracking-wider">
                                    {shiftFormData.shift_type === 'work' ? '勤務場所' : '予定タイトル'}
                                </label>
                                <div className="relative">
                                    <MapPin className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
                                    {shiftFormData.shift_type === 'work' ? (
                                        <div className="w-full pl-10 pr-4 py-3 bg-gray-100 border border-gray-100 rounded-2xl text-gray-500 font-bold">
                                            {shiftFormData.location}
                                        </div>
                                    ) : (
                                        <input
                                            required
                                            placeholder="例：打合せ、私用、○○社訪問など"
                                            value={shiftFormData.location}
                                            onChange={(e) => setShiftFormData({ ...shiftFormData, location: e.target.value })}
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5 px-1 uppercase tracking-wider">開始時間</label>
                                    {shiftFormData.shift_type === 'work' ? (
                                        <div className="w-full px-4 py-3 bg-gray-100 border border-gray-100 rounded-2xl text-gray-500 font-bold">
                                            {shiftFormData.start_time}
                                        </div>
                                    ) : (
                                        <input
                                            type="time"
                                            required
                                            value={shiftFormData.start_time}
                                            onChange={(e) => setShiftFormData({ ...shiftFormData, start_time: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                                        />
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5 px-1 uppercase tracking-wider">終了時間</label>
                                    {shiftFormData.shift_type === 'work' ? (
                                        <div className="w-full px-4 py-3 bg-gray-100 border border-gray-100 rounded-2xl text-gray-500 font-bold">
                                            {shiftFormData.end_time}
                                        </div>
                                    ) : (
                                        <input
                                            type="time"
                                            required
                                            value={shiftFormData.end_time}
                                            onChange={(e) => setShiftFormData({ ...shiftFormData, end_time: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-5 space-y-4">
                                <h4 className="text-sm font-bold text-indigo-600 flex items-center gap-2">
                                    <FileText size={16} /> プランニング・メモ
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 px-1">起床予定</label>
                                        <input
                                            type="time"
                                            value={shiftFormData.planned_wake_up_time}
                                            onChange={(e) => setShiftFormData({ ...shiftFormData, planned_wake_up_time: e.target.value })}
                                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 px-1">出発予定</label>
                                        <input
                                            type="time"
                                            value={shiftFormData.planned_leave_time}
                                            onChange={(e) => setShiftFormData({ ...shiftFormData, planned_leave_time: e.target.value })}
                                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 px-1">備考 / 連絡事項</label>
                                    <textarea
                                        placeholder="TimeTree風の共有メモとして利用できます"
                                        rows={3}
                                        value={shiftFormData.daily_memo}
                                        onChange={(e) => setShiftFormData({ ...shiftFormData, daily_memo: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm resize-none"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitLoading || !shiftFormData.location}
                                className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl shadow-md hover:bg-emerald-600 active:scale-[0.98] transition-all mt-4 disabled:opacity-50"
                            >
                                {submitLoading ? '保存中...' : '予定を保存'}
                            </button>
                        </form>
                    </div>
                </div>
            )}


            {/* Holiday Request Modal */}
            {showHolidayModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <span className="bg-amber-100 text-amber-600 p-1.5 rounded-xl">✨</span>
                                希望休を申請する
                            </h3>
                            <form onSubmit={handleHolidaySubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5 px-1 uppercase tracking-wider">希望日</label>
                                    <input
                                        type="date"
                                        required
                                        value={holidayDate}
                                        onChange={(e) => setHolidayDate(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5 px-1 uppercase tracking-wider">理由 (任意)</label>
                                    <textarea
                                        placeholder="私用、冠婚葬祭など..."
                                        rows={3}
                                        value={holidayReason}
                                        onChange={(e) => setHolidayReason(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none"
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowHolidayModal(false)}
                                        className="flex-1 py-3 bg-gray-50 text-gray-600 font-bold rounded-2xl hover:bg-gray-100 transition-colors"
                                    >
                                        キャンセル
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitLoading}
                                        className="flex-1 py-3 bg-amber-500 text-white font-bold rounded-2xl hover:bg-amber-600 transition-all shadow-md active:scale-95 disabled:opacity-50"
                                    >
                                        {submitLoading ? '申請中...' : '申請する'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Calendar Selection List Modal (for viewing others) */}
            {showCalendarList && (
                <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={() => setShowCalendarList(false)}>
                    <div className="bg-gray-50 w-full max-h-[85vh] rounded-t-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4 sticky top-0 bg-gray-50 z-10">
                            <div>
                                <h3 className="text-xl font-black text-gray-800">カレンダーリスト</h3>
                                <p className="text-xs font-bold text-gray-400">表示するカレンダーを選択してください</p>
                            </div>
                            <button onClick={() => setShowCalendarList(false)} className="bg-white text-gray-500 p-2.5 rounded-full shadow-sm hover:bg-gray-100 transition-colors border border-gray-100">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-6 pb-12 pr-1">
                            {/* 自分のカレンダー */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">マイカレンダー</h4>
                                <button
                                    onClick={() => { setTargetUser(user); setShowCalendarList(false); }}
                                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${targetUser?.id === user?.id ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-500/20' : 'bg-white border-gray-100 text-gray-700 hover:border-emerald-200'}`}
                                >
                                    <div className={`p-2 rounded-xl ${targetUser?.id === user?.id ? 'bg-white/20' : 'bg-emerald-50 text-emerald-600'}`}>
                                        <UserIcon size={20} />
                                    </div>
                                    <span className="font-bold flex-1 text-left">自分のシフト</span>
                                    {targetUser?.id === user?.id && <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>}
                                </button>
                            </div>

                            {/* ロール別カレンダー */}
                            {(['PRESIDENT', 'EXECUTIVE', 'MANAGER', 'STAFF'] as const).map((role) => {
                                const roleUsers = allUsers.filter(u => u.role.toUpperCase() === role);
                                const selfInRole = user && user.role.toUpperCase() === role;
                                const totalCount = roleUsers.length + (selfInRole && !roleUsers.find(u => u.id === user?.id) ? 1 : 0);
                                if (totalCount === 0) return null;

                                const labels: Record<string, string> = { PRESIDENT: '社長', EXECUTIVE: '幹部', MANAGER: '役職社員', STAFF: '社員' };
                                const isActive = selectedGroupRole === role;

                                return (
                                    <button
                                        key={role}
                                        onClick={() => {
                                            setSelectedGroupRole(role);
                                            setTargetUser(null);
                                            setShowCalendarList(false);
                                        }}
                                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${isActive
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20'
                                                : 'bg-white border-gray-100 text-gray-700 hover:border-indigo-200'
                                            }`}
                                    >
                                        <div className={`p-2 rounded-xl ${isActive ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600'}`}>
                                            <Users size={20} />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <span className="font-bold block">{labels[role]}カレンダー</span>
                                            <span className={`text-[9px] font-black ${isActive ? 'text-indigo-200' : 'text-gray-400'}`}>{totalCount}名</span>
                                        </div>
                                        {isActive && <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>}
                                    </button>
                                );
                            })}

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
