"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ChevronLeft, ChevronRight, ArrowLeft, Search, Building2, UserCircle2, Calendar as CalendarIcon, Clock, Filter
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
                            <p className="text-xs text-gray-500 mt-1">
                                すべてのスタッフと店舗のシフト状況を俯瞰して確認できます。
                            </p>
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

            {/* Grid */}
            <div className="flex-1 bg-gray-200 border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
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

                            const hasHolidays = holidays.filter(h =>
                                h.date === d.dateStr &&
                                filteredUsers.some(u => u.id === h.user_id)
                            );

                            return (
                                <div key={d.dateStr} className={`p-1 md:p-2 flex flex-col gap-1 transition-colors hover:bg-gray-50/50 min-w-0 ${d.weekday === 0 ? 'bg-red-50/30' : d.weekday === 6 ? 'bg-blue-50/30' : 'bg-white'
                                    }`}>
                                    <div className={`text-xs font-bold mb-0.5 flex flex-wrap items-center gap-1 ${d.weekday === 0 ? 'text-red-600' : d.weekday === 6 ? 'text-blue-600' : 'text-gray-700'
                                        }`}>
                                        <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/50">{d.day}</span>
                                        {hasHolidays.length > 0 && (
                                            <span className="text-[9px] bg-red-100 text-red-600 px-1 rounded-sm border border-red-200 hidden md:inline-block truncate" title={hasHolidays.map(h => filteredUsers.find(u => u.id === h.user_id)?.display_name).join(', ')}>
                                                休: {hasHolidays.length}名
                                            </span>
                                        )}
                                        {hasHolidays.length > 0 && (
                                            <span className="text-[9px] bg-red-100 text-red-600 px-1 rounded-sm border border-red-200 md:hidden block">
                                                休
                                            </span>
                                        )}
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
        </div>
    );
}
