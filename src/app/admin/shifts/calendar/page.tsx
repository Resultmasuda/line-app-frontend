"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ChevronLeft, ChevronRight, ArrowLeft, Search, Building2, UserCircle2, Calendar as CalendarIcon, Clock, Filter, X, AlertCircle
} from 'lucide-react';
import {
    getAllShifts, getAllStores, getAllUsers, StoreRecord, AdminUserRecord,
    getHolidayRequests, HolidayRequest,
    getAllAttendances, ShiftRecord
} from '@/lib/api/admin';

export default function AllStaffCalendarPage() {
    const router = useRouter();

    const [currentDate, setCurrentDate] = useState(new Date());
    const [stores, setStores] = useState<StoreRecord[]>([]);
    const [users, setUsers] = useState<AdminUserRecord[]>([]);
    const [shifts, setShifts] = useState<ShiftRecord[]>([]);
    const [holidays, setHolidays] = useState<HolidayRequest[]>([]);
    const [attendances, setAttendances] = useState<any[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [storeFilter, setStoreFilter] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
    const [selectedDateShifts, setSelectedDateShifts] = useState<{ date: string, shifts: ShiftRecord[], holidays: HolidayRequest[] } | null>(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);
    const dates = Array.from({ length: daysInMonth }, (_, i) => {
        const d = new Date(year, month, i + 1);
        return {
            dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`,
            day: i + 1,
            weekday: d.getDay()
        };
    });

    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

    useEffect(() => {
        async function fetchInitialData() {
            setIsLoading(true);
            const ym = `${year}-${String(month + 1).padStart(2, '0')}`;

            const [storeRes, userRes, shiftRes, holidayRes, attendanceRes] = await Promise.all([
                getAllStores(),
                getAllUsers(),
                getAllShifts(ym),
                getHolidayRequests(ym),
                getAllAttendances(ym)
            ]);

            if (storeRes.success && storeRes.data) setStores(storeRes.data);
            if (userRes.success && userRes.data) {
                // Alphabetical sort for all users view
                const sortedUsers = userRes.data.sort((a, b) => a.display_name.localeCompare(b.display_name));
                setUsers(sortedUsers);
            }
            if (shiftRes.success && shiftRes.data) setShifts(shiftRes.data);
            if (holidayRes.success && holidayRes.data) setHolidays(holidayRes.data);
            if (attendanceRes.success && attendanceRes.data) setAttendances(attendanceRes.data);

            setIsLoading(false);
        }
        fetchInitialData();
    }, [year, month]);

    const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    // Determine the color of a shift based on its store's presets
    const getShiftColor = (shift: ShiftRecord) => {
        const store = stores.find(s => s.name === shift.location);
        if (store && store.presets) {
            const preset = store.presets.find(p => p.start === shift.start_time?.slice(0, 5) && p.end === shift.end_time?.slice(0, 5));
            if (preset) return preset.color;
        }
        return 'bg-blue-50 text-blue-700 border-blue-200';
    };

    const getShiftPresetLabel = (shift: ShiftRecord) => {
        const store = stores.find(s => s.name === shift.location);
        if (store && store.presets) {
            const preset = store.presets.find(p => p.start === shift.start_time?.slice(0, 5) && p.end === shift.end_time?.slice(0, 5));
            if (preset) return preset.label;
        }
        return `${shift.start_time?.slice(0, 5) || '--:--'}〜${shift.end_time?.slice(0, 5) || '--:--'}`;
    };

    // Filtered users
    const filteredUsers = users.filter(user => {
        if (searchQuery && !user.display_name.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }
        if (storeFilter !== 'all') {
            const userShifts = shifts.filter(s => s.user_id === user.id);
            if (!userShifts.some(s => s.location === storeFilter)) {
                // Check if they are affiliated
                const store = stores.find(s => s.name === storeFilter);
                if (!store?.affiliated_staff?.includes(user.id)) {
                    return false;
                }
            }
        }
        return true;
    });

    if (isLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-theme(spacing.24))] flex flex-col space-y-4">
            {/* Header */}
            <div className="flex-none bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/admin/shifts')}
                            className="p-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                        >
                            <ArrowLeft size={18} className="text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <CalendarIcon className="text-indigo-500" size={24} />
                                全社員 月間シフト一覧
                            </h1>
                            <div className="flex items-center gap-4 mt-1">
                                <p className="text-xs text-gray-500">
                                    すべてのスタッフと店舗のシフト状況を俯瞰して確認できます。
                                </p>
                                <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                                    <button
                                        onClick={() => setViewMode('calendar')}
                                        className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${viewMode === 'calendar' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        カレンダー
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        リスト形式
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap mt-2 lg:mt-0 w-full lg:w-auto">
                        <div className="relative flex-1 sm:flex-none">
                            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <select
                                value={storeFilter}
                                onChange={(e) => setStoreFilter(e.target.value)}
                                className="pl-8 pr-8 py-2 w-full sm:w-40 rounded-lg text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-gray-50"
                            >
                                <option value="all">すべての店舗</option>
                                {stores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="relative flex-1 sm:flex-none">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input
                                type="text"
                                placeholder="スタッフ名で検索..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 pr-3 py-2 w-full sm:w-40 rounded-lg text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                            />
                        </div>
                        
                        {(searchQuery || storeFilter !== 'all') && filteredUsers.length === 1 && (
                             <div className="bg-indigo-50 border border-indigo-100 px-3 py-2 rounded-lg flex items-center gap-2">
                                <span className="text-xs font-bold text-indigo-700">{filteredUsers[0].display_name} 殿: 当月計 {shifts.filter(s => s.user_id === filteredUsers[0].id && s.status === 'published').length}日</span>
                             </div>
                        )}


                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-1 shadow-inner px-2 gap-2 w-full sm:w-auto justify-center">
                            <button onClick={handlePrevMonth} className="p-1 hover:bg-white rounded transition-colors border border-transparent hover:border-gray-200 shadow-sm">
                                <ChevronLeft size={16} className="text-gray-600" />
                            </button>
                            <span className="font-bold text-gray-800 text-sm whitespace-nowrap px-1">
                                {year}年 {month + 1}月
                            </span>
                            <button onClick={handleNextMonth} className="p-1 hover:bg-white rounded transition-colors border border-transparent hover:border-gray-200 shadow-sm">
                                <ChevronRight size={16} className="text-gray-600" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid vs List View */}
            <div className="flex-1 bg-gray-200 border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                {viewMode === 'calendar' ? (
                    <div className="flex flex-col h-full">
                        {/* Weekday Headers */}
                        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                            {weekdays.map((day, i) => (
                                <div key={day} className={`p-2 text-center text-[10px] md:text-sm font-bold ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'
                                    }`}>
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Days Grid */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-200">
                            <div className="grid grid-cols-7 auto-rows-[minmax(100px,1fr)] md:auto-rows-[minmax(140px,1fr)] gap-[1px]">
                                {emptyDays.map(empty => (
                                    <div key={`empty-${empty}`} className="bg-gray-50/50"></div>
                                ))}
                                {dates.map(d => {
                                    // Find all shifts on this date for the filtered users
                                    const dayShifts = shifts.filter(s =>
                                        s.date === d.dateStr &&
                                        s.status === 'published' &&
                                        filteredUsers.some(u => u.id === s.user_id)
                                    );

                                    const dayHolidays = holidays.filter(h =>
                                        h.date === d.dateStr &&
                                        h.status !== 'REJECTED' &&
                                        filteredUsers.some(u => u.id === h.user_id)
                                    );

                                    return (
                                        <div
                                            key={d.dateStr}
                                            onClick={() => setSelectedDateShifts({
                                                date: d.dateStr,
                                                shifts: dayShifts,
                                                holidays: dayHolidays
                                            })}
                                            className={`p-1 md:p-2 flex flex-col gap-1 transition-colors hover:bg-indigo-50/50 cursor-pointer min-w-0 border-r border-b border-gray-100 ${d.weekday === 0 ? 'bg-red-50/30' : d.weekday === 6 ? 'bg-blue-50/30' : 'bg-white'
                                                }`}
                                        >
                                            <div className={`text-xs font-bold mb-0.5 flex flex-wrap items-center justify-between ${d.weekday === 0 ? 'text-red-600' : d.weekday === 6 ? 'text-blue-600' : 'text-gray-700'
                                                }`}>
                                                <div className="flex items-center gap-1">
                                                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/50">{d.day}</span>
                                                    {dayHolidays.length > 0 && (
                                                        <span className="text-[9px] bg-red-100 text-red-600 px-1 rounded-sm border border-red-200 hidden md:inline-block truncate" title={dayHolidays.map(h => users.find(u => u.id === h.user_id)?.display_name).join(', ')}>
                                                            休: {dayHolidays.length}名
                                                        </span>
                                                    )}
                                                    {dayHolidays.length > 0 && (
                                                        <span className="text-[9px] bg-red-100 text-red-600 px-1 rounded-sm border border-red-200 md:hidden block">
                                                            休
                                                        </span>
                                                    )}
                                                </div>
                                                {dayShifts.length > 0 && <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1 rounded hidden md:block">{dayShifts.length}件</span>}
                                            </div>

                                            <div className="flex-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar pr-0.5 min-h-0">
                                                {dayShifts.map((shift, i) => {
                                                    const user = filteredUsers.find(u => u.id === shift.user_id);
                                                    if (!user) return null;
                                                    return (
                                                        <div key={i} className={`text-[9px] md:text-[11px] px-1 md:px-1.5 py-0.5 md:py-1 rounded border leading-tight ${getShiftColor(shift)}`} title={`${shift.location}: ${shift.start_time?.slice(0, 5)}〜${shift.end_time?.slice(0, 5)}`}>
                                                            <div className="font-bold truncate">{user.display_name}</div>
                                                            <div className="opacity-80 text-[8px] md:text-[9px] truncate">{shift.location} ({getShiftPresetLabel(shift)})</div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-white p-4">
                        <div className="max-w-4xl mx-auto space-y-6">
                            {dates.map(d => {
                                const dayShifts = shifts.filter(s =>
                                    s.date === d.dateStr &&
                                    s.status === 'published' &&
                                    filteredUsers.some(u => u.id === s.user_id)
                                );
                                const dayHolidays = holidays.filter(h =>
                                    h.date === d.dateStr &&
                                    h.status !== 'REJECTED' &&
                                    filteredUsers.some(u => u.id === h.user_id)
                                );

                                if (dayShifts.length === 0 && dayHolidays.length === 0) return null;

                                return (
                                    <div key={d.dateStr} className="flex gap-4 border-b border-gray-100 pb-6 last:border-0 group">
                                        <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center flex-none ${
                                            d.weekday === 0 ? 'bg-red-50 text-red-600' : d.weekday === 6 ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-600'
                                        }`}>
                                            <span className="text-[10px] font-bold">{weekdays[d.weekday]}</span>
                                            <span className="text-xl font-black">{d.day}</span>
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            {dayHolidays.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {dayHolidays.map(h => (
                                                        <div key={h.id} className="bg-red-50 border border-red-100 px-2 py-1 rounded-lg flex items-center gap-2">
                                                            <span className="text-[10px] font-bold text-red-700">{users.find(u => u.id === h.user_id)?.display_name}</span>
                                                            <span className="text-[8px] bg-red-200 text-red-700 px-1 rounded font-black">希望休</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {dayShifts.map(s => (
                                                    <div key={s.id} className={`p-3 rounded-xl border flex justify-between items-center transition-all hover:shadow-md cursor-pointer ${getShiftColor(s)}`}
                                                        onClick={() => setSelectedDateShifts({ date: d.dateStr, shifts: dayShifts, holidays: dayHolidays })}
                                                    >
                                                        <div>
                                                            <div className="font-bold text-sm">{users.find(u => u.id === s.user_id)?.display_name}</div>
                                                            <div className="text-[10px] opacity-70">{s.location}</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-xs font-black">{getShiftPresetLabel(s)}</div>
                                                            {s.daily_memo && <div className="text-[9px] opacity-60 mt-0.5">📝</div>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {dates.every(d => {
                                const ds = shifts.filter(s => s.date === d.dateStr && s.status === 'published' && filteredUsers.some(u => u.id === s.user_id));
                                const dh = holidays.filter(h => h.date === d.dateStr && filteredUsers.some(u => u.id === h.user_id));
                                return ds.length === 0 && dh.length === 0;
                            }) && (
                                <div className="text-center py-20">
                                    <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                                        <CalendarIcon className="text-gray-300" size={32} />
                                    </div>
                                    <p className="text-gray-500 font-bold">この月の予定はありません</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f1f1; 
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1; 
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8; 
                }
            `}</style>
            {selectedDateShifts && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={() => setSelectedDateShifts(null)}>
                    <div className="bg-gray-50 rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
                            <div>
                                <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                                    <CalendarIcon className="text-indigo-500" size={20} />
                                    {selectedDateShifts.date.replace(/-/g, '/')} の詳細
                                </h3>
                                <p className="text-xs font-bold text-gray-400 mt-0.5">この日の全スタッフの予定状況</p>
                            </div>
                            <button onClick={() => setSelectedDateShifts(null)} className="p-2.5 bg-gray-50 text-gray-500 rounded-full hover:bg-gray-100 transition-all border border-gray-100 group">
                                <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar pb-10">
                            {/* 希望休セクション */}
                            {(() => {
                                const validHolidays = selectedDateShifts.holidays.filter(h => h.status !== 'REJECTED');
                                if (validHolidays.length === 0) return null;
                                return (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between px-1">
                                            <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1.5">
                                                <AlertCircle size={14} strokeWidth={3} /> 希望休を申請中のスタッフ ({validHolidays.length}名)
                                            </h4>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {validHolidays.map(h => (
                                                <div key={h.id} className="bg-white border border-red-50 p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-red-400"></div>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="font-black text-gray-800">{users.find(u => u.id === h.user_id)?.display_name || '不明'}</span>
                                                        <span className="text-[8px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-black">LEAVE REQUEST</span>
                                                    </div>
                                                    {h.reason ? (
                                                        <p className="text-xs text-red-600/70 italic bg-red-50/50 p-2 rounded-xl border border-red-100/30">
                                                            理由: {h.reason}
                                                        </p>
                                                    ) : (
                                                        <p className="text-[10px] text-gray-400 italic">理由は記入されていません</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* シフトセクション */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between px-1">
                                    <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                                        <Clock size={14} strokeWidth={3} /> 当日のシフト配置 ({selectedDateShifts.shifts.length}件)
                                    </h4>
                                </div>
                                
                                {selectedDateShifts.shifts.length === 0 ? (
                                    <div className="bg-white rounded-[24px] border border-gray-100 p-12 text-center shadow-sm">
                                        <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                                            <CalendarIcon className="text-gray-200" size={28} />
                                        </div>
                                        <p className="text-gray-400 font-bold text-sm italic">この日のシフトはありません</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3">
                                        {selectedDateShifts.shifts.map(s => {
                                            const u = users.find(user => user.id === s.user_id);
                                            return (
                                                <div key={s.id} className="bg-white p-4 rounded-[20px] border border-gray-100 shadow-sm hover:shadow-md transition-all flex justify-between items-center group relative overflow-hidden">
                                                    <div className="flex items-center gap-4">
                                                        <div className="relative">
                                                            <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center font-black shadow-inner">
                                                                {u?.display_name.charAt(0)}
                                                            </div>
                                                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center shadow-sm">
                                                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="font-black text-gray-800 text-lg group-hover:text-indigo-600 transition-colors">{u?.display_name || '不明'}</div>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <Building2 size={12} className="text-gray-400" />
                                                                <span className="text-[10px] font-bold text-gray-500">{s.location}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex flex-col items-end gap-2">
                                                        <div className={`px-4 py-1.5 rounded-2xl font-black text-sm border shadow-sm ${getShiftColor(s)}`}>
                                                            {getShiftPresetLabel(s)}
                                                        </div>
                                                        {s.daily_memo && (
                                                            <div className="flex items-center gap-1.5 bg-amber-50 text-amber-600 px-3 py-1 rounded-full border border-amber-100 max-w-[200px] truncate" title={s.daily_memo}>
                                                                <span className="text-[10px] font-black">MEMO:</span>
                                                                <span className="text-[10px] font-bold truncate">{s.daily_memo}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
