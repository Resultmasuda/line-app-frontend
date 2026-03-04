"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ChevronLeft, ChevronRight, Save, X, Building2, UserCircle2, ArrowLeft, Copy, Search, Clock,
    Calendar as CalendarIcon, LayoutGrid, Settings2, Plus, Trash2, Send, AlertCircle, Pencil
} from 'lucide-react';
import {
    getAllShifts, getAllStores, getAllUsers, StoreRecord, AdminUserRecord,
    bulkUpsertShifts, bulkDeleteShifts, getHolidayRequests, HolidayRequest,
    updateStorePresets, getAllAttendances, ShiftRecord
} from '@/lib/api/admin';

// ShiftRecord type is imported from '@/lib/api/admin'

// State mapping for the grid: { "userId_YYYY-MM-DD": { start_time, end_time, shiftId?, isModified?, isDeleted? } }
type GridState = Record<string, {
    start_time: string;
    end_time: string;
    shiftId?: string;
    isModified?: boolean;
    isDeleted?: boolean;
    status?: string;
    planned_wake_up_time?: string;
    planned_leave_time?: string;
    daily_memo?: string;
}>;

const SHIFT_PRESETS = [
    { label: '早番', start: '10:00', end: '19:00', color: 'bg-orange-50 text-orange-700 border-orange-200' },
    { label: '中番', start: '11:00', end: '20:00', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { label: '遅番', start: '12:00', end: '21:00', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { label: '未定', start: '', end: '', color: 'bg-gray-50 text-gray-700 border-gray-200' },
];

// CSS for Staging Mode Stripes
const STAGE_STRIPE_STYLE = {
    backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.4) 5px, rgba(255,255,255,0.4) 10px)`
};
const PRESET_COLOR_OPTIONS = [
    { name: 'Emerald', value: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { name: 'Indigo', value: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { name: 'Orange', value: 'bg-orange-50 text-orange-700 border-orange-200' },
    { name: 'Blue', value: 'bg-blue-50 text-blue-700 border-blue-200' },
    { name: 'Purple', value: 'bg-purple-50 text-purple-700 border-purple-200' },
    { name: 'Pink', value: 'bg-pink-50 text-pink-700 border-pink-200' },
    { name: 'Gray', value: 'bg-gray-50 text-gray-700 border-gray-200' },
    { name: 'Red', value: 'bg-red-50 text-red-700 border-red-200' },
];

export default function AdvancedShiftBuilder() {
    const params = useParams();
    const router = useRouter();
    const storeId = params.storeId as string;

    const [currentDate, setCurrentDate] = useState(new Date());
    const [store, setStore] = useState<StoreRecord | null>(null);
    const [users, setUsers] = useState<AdminUserRecord[]>([]);

    // Core states
    const [originalShifts, setOriginalShifts] = useState<ShiftRecord[]>([]);
    const [gridState, setGridState] = useState<GridState>({});
    const [attendances, setAttendances] = useState<any[]>([]); // New state

    // UI states
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [allMonthlyShifts, setAllMonthlyShifts] = useState<ShiftRecord[]>([]);
    const [holidays, setHolidays] = useState<HolidayRequest[]>([]);
    const [copiedTime, setCopiedTime] = useState<{ start: string, end: string } | null>(null);
    const [activePresetIndex, setActivePresetIndex] = useState<number | null>(null);
    const [isStampMode, setIsStampMode] = useState(false);
    const [showAllStaff, setShowAllStaff] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [pendingConfirm, setPendingConfirm] = useState<{ message: string, action: () => void } | null>(null);

    // Phase R States
    const [viewMode, setViewMode] = useState<'grid' | 'calendar'>('calendar');
    const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
    const [isDayDetailsModalOpen, setIsDayDetailsModalOpen] = useState(false);
    const [selectedDateForDetails, setSelectedDateForDetails] = useState<string | null>(null);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [storePresets, setStorePresets] = useState(SHIFT_PRESETS);
    const [selectedUserForCalendar, setSelectedUserForCalendar] = useState<AdminUserRecord | null>(null);

    // Get days in the selected month
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
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
                getAllAttendances(ym) // Added this
            ]);

            if (storeRes.success && storeRes.data) {
                const foundStore = storeRes.data.find(s => s.id === storeId);
                setStore(foundStore || null);

                // Load store-specific presets if available
                if (foundStore?.presets && foundStore.presets.length > 0) {
                    setStorePresets(foundStore.presets);
                }

                if (foundStore && shiftRes.success && shiftRes.data) {
                    setAllMonthlyShifts(shiftRes.data);
                    const storeShifts = shiftRes.data.filter(s => s.location === foundStore.name);
                    setOriginalShifts(storeShifts);

                    // Initialize grid state
                    const initialGrid: GridState = {};
                    storeShifts.forEach(s => {
                        const key = `${s.user_id}_${s.date}`;
                        initialGrid[key] = {
                            start_time: s.start_time ? s.start_time.slice(0, 5) : '',
                            end_time: s.end_time ? s.end_time.slice(0, 5) : '',
                            shiftId: s.id,
                            isModified: false,
                            isDeleted: false,
                            status: s.status || 'published',
                            planned_wake_up_time: s.planned_wake_up_time || '',
                            planned_leave_time: s.planned_leave_time || '',
                            daily_memo: s.daily_memo || ''
                        };
                    });
                    setGridState(initialGrid);
                }
            }

            if (holidayRes.success && holidayRes.data) {
                setHolidays(holidayRes.data);
            }

            if (attendanceRes.success && attendanceRes.data) {
                setAttendances(attendanceRes.data);
            }

            if (userRes.success && userRes.data) {
                // Sort users: 1) Affiliated staff first, 2) Alphabetical
                const affiliatedIds = storeRes.data?.find(s => s.id === storeId)?.affiliated_staff || [];
                const sortedUsers = userRes.data.sort((a, b) => {
                    const aIsAffiliated = affiliatedIds.includes(a.id);
                    const bIsAffiliated = affiliatedIds.includes(b.id);
                    if (aIsAffiliated && !bIsAffiliated) return -1;
                    if (!aIsAffiliated && bIsAffiliated) return 1;
                    return a.display_name.localeCompare(b.display_name);
                });
                setUsers(sortedUsers);
            }

            setIsLoading(false);
        }
        fetchInitialData();
    }, [storeId, year, month]);

    const handleSavePresets = async (newPresets: typeof storePresets) => {
        setIsSaving(true);
        const res = await updateStorePresets(storeId, newPresets);
        if (res.success) {
            setStorePresets(newPresets);
            setIsPresetModalOpen(false);
            // Also update the local store state to keep it in sync
            if (store) {
                setStore({ ...store, presets: newPresets });
            }
        } else {
            alert('プリセットの保存に失敗しました。');
        }
        setIsSaving(false);
    };

    const handleCalendarDateClick = (dateStr: string) => {
        if (!isStampMode) {
            setSelectedDateForDetails(dateStr);
            setIsDayDetailsModalOpen(true);
            return;
        }

        if (!selectedUserForCalendar) {
            alert('スタンプするスタッフを選択してください。');
            return;
        }

        // Use active preset or copied time
        let start = '';
        let end = '';

        if (activePresetIndex === 999) {
            start = 'delete';
            end = 'delete';
        } else if (activePresetIndex !== null) {
            const p = storePresets[activePresetIndex];
            if (p) {
                start = p.start;
                end = p.end;
            }
        } else if (copiedTime) {
            start = copiedTime.start;
            end = copiedTime.end;
        } else {
            alert('適用するプリセットを選択するか、時間をコピーしてください。');
            return;
        }

        const key = `${selectedUserForCalendar.id}_${dateStr}`;

        if (start === 'delete') {
            setGridState(prev => ({
                ...prev,
                [key]: {
                    ...(prev[key] || {}),
                    start_time: '',
                    end_time: '',
                    status: 'draft',
                    isModified: true,
                    isDeleted: true
                }
            }));
            return;
        }

        setGridState(prev => ({
            ...prev,
            [key]: {
                ...(prev[key] || {}),
                start_time: start,
                end_time: end,
                status: 'draft',
                isModified: true,
                isDeleted: false
            }
        }));
    };

    const handlePrevMonth = () => {
        if (!hasUnsavedChanges()) {
            setCurrentDate(new Date(year, month - 1, 1));
        } else {
            setPendingConfirm({
                message: '保存されていない変更は破棄されます。前の月へ移動しますか？',
                action: () => setCurrentDate(new Date(year, month - 1, 1))
            });
        }
    };

    const handleNextMonth = () => {
        if (!hasUnsavedChanges()) {
            setCurrentDate(new Date(year, month + 1, 1));
        } else {
            setPendingConfirm({
                message: '保存されていない変更は破棄されます。次の月へ移動しますか？',
                action: () => setCurrentDate(new Date(year, month + 1, 1))
            });
        }
    };

    const hasUnsavedChanges = () => {
        return Object.values(gridState).some(cell => cell.isModified || cell.isDeleted);
    };

    const getCellStyle = (userId: string, dateStr: string, cell: any) => {
        if (!cell || (!cell.isModified && cell.isDeleted) || (!cell.isModified && cell.start_time === '' && cell.end_time === '')) return 'bg-white border-gray-100';

        // 1. Check for Preset Color
        const preset = storePresets.find(p => p.start === cell.start_time && p.end === cell.end_time);
        let bgColor = preset ? preset.color : 'bg-gray-50 text-gray-600 border-gray-200';

        // 2. Draft vs Published Styling
        // Draft: Stripe Pattern (Diagonal)
        // Published: Solid (Colored bg)
        if (cell.status === 'draft') {
            if (cell.isDeleted) {
                return 'relative border-2 border-dashed border-red-400 text-red-700 shadow-inner bg-red-50/40 staging-stripes';
            }

            const textColor = preset ? preset.color.split(' ').find(c => c.startsWith('text-')) || 'text-blue-700' : 'text-gray-700';
            const borderClass = preset?.color.split(' ').find(c => c.startsWith('border-')) || 'border-blue-400';

            return `relative border-2 border-dashed ${borderClass} ${textColor} shadow-inner bg-opacity-40 staging-stripes`;
        }

        // 3. Alert Logic (Visual Alerts)
        // If it's a published shift (published status or has a shiftId)
        if (cell.shiftId) {
            const userAttendances = attendances.filter(a => a.user_id === userId && a.date === dateStr);

            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const isPast = dateStr < todayStr;

            if (isToday || isPast) {
                // Check Wake Up Alert
                if (cell.planned_wake_up_time) {
                    const hasWakeUp = userAttendances.some(a => a.type === 'WAKE_UP');
                    if (!hasWakeUp) {
                        const [h, m] = cell.planned_wake_up_time.split(':').map(Number);
                        const plannedTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m + 15); // 15 min buffer
                        if (isPast || (isToday && now > plannedTime)) {
                            return 'bg-red-100 text-red-700 border-red-300';
                        }
                    }
                }

                // Check Leave Alert
                if (cell.planned_leave_time) {
                    const hasLeave = userAttendances.some(a => a.type === 'LEAVE');
                    if (!hasLeave) {
                        const [h, m] = cell.planned_leave_time.split(':').map(Number);
                        const plannedTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m + 15);
                        if (isPast || (isToday && now > plannedTime)) {
                            return 'bg-red-100 text-red-700 border-red-300';
                        }
                    }
                }
            }
        }

        return bgColor;
    };

    const handleCellChange = (userId: string, dateStr: string, field: keyof GridState[string], value: any) => {
        const key = `${userId}_${dateStr}`;
        setGridState(prev => {
            const currentCell = prev[key] || { start_time: '', end_time: '' };
            return {
                ...prev,
                [key]: {
                    ...currentCell,
                    [field]: value,
                    isModified: true,
                    isDeleted: false
                }
            };
        });
    };

    const clearCell = (userId: string, dateStr: string) => {
        const key = `${userId}_${dateStr}`;
        setGridState(prev => {
            if (!prev[key]) return prev;
            return {
                ...prev,
                [key]: {
                    ...prev[key],
                    start_time: '',
                    end_time: '',
                    isDeleted: !!prev[key].shiftId, // Only mark deleted if it exists in DB
                    isModified: !prev[key].shiftId  // If it doesn't exist in DB, just modified to empty
                }
            };
        });
    };

    const copyCell = (userId: string, dateStr: string) => {
        const key = `${userId}_${dateStr}`;
        if (gridState[key] && !gridState[key].isDeleted && gridState[key].start_time) {
            setCopiedTime({ start: gridState[key].start_time, end: gridState[key].end_time });
        }
    };

    const pasteCell = (userId: string, dateStr: string) => {
        if (!copiedTime) return;
        const key = `${userId}_${dateStr}`;

        if (copiedTime.start === 'delete') {
            setGridState(prev => ({
                ...prev,
                [key]: {
                    ...(prev[key] || {}),
                    start_time: '',
                    end_time: '',
                    isModified: true,
                    isDeleted: true
                }
            }));
            return;
        }

        setGridState(prev => ({
            ...prev,
            [key]: {
                ...(prev[key] || {}),
                start_time: copiedTime.start,
                end_time: copiedTime.end,
                status: 'draft',
                isModified: true,
                isDeleted: false
            }
        }));
    };

    const pastePreset = (userId: string, dateStr: string, presetIndex: number) => {
        if (presetIndex === 999) {
            pasteCell(userId, dateStr);
            return;
        }
        const p = storePresets[presetIndex];
        if (!p) return;
        const key = `${userId}_${dateStr}`;
        setGridState(prev => ({
            ...prev,
            [key]: {
                ...(prev[key] || {}),
                start_time: p.start,
                end_time: p.end,
                isModified: true,
                isDeleted: false
            }
        }));
    };

    const handleSaveAll = async (publishAll: boolean = false) => {
        if (!store) return;
        setIsSaving(true);

        const upserts: (Omit<ShiftRecord, 'id'> & { id?: string })[] = [];
        const deletes: string[] = [];
        const conflicts: string[] = [];

        Object.entries(gridState).forEach(([key, cell]) => {
            const [userId, date] = key.split('_');
            const userName = users.find(u => u.id === userId)?.display_name || '不明';

            if (cell.isDeleted && cell.shiftId) {
                deletes.push(cell.shiftId);
            } else if ((cell.isModified || (publishAll && cell.status === 'draft')) && !cell.isDeleted) {
                // If both times are empty, it's a "Timeless Shift" (placeholder)
                // If only one is empty, it's invalid unless we want to allow it.
                // For now, let's treat "both empty" as a valid placeholder, and "mixed" as validation error.
                if ((cell.start_time && !cell.end_time) || (!cell.start_time && cell.end_time)) {
                    // Skip or alert? Let's just skip invalid ones for now to avoid hang
                    return;
                }

                // Overlap Check (against other stores)
                if (cell.start_time && cell.end_time) {
                    const hasConflict = allMonthlyShifts.some(other => {
                        if (other.user_id !== userId || other.date !== date || other.location === store.name) return false;
                        if (other.id && cell.shiftId === other.id) return false;

                        // Time overlap logic
                        const s1 = cell.start_time;
                        const e1 = cell.end_time;
                        const s2 = other.start_time.slice(0, 5);
                        const e2 = other.end_time.slice(0, 5);
                        return (s1 < e2 && e1 > s2);
                    });

                    if (hasConflict) {
                        conflicts.push(`${userName} (${date}): 他店舗のシフトと時間が重なっています`);
                    }
                }

                const shiftData: Omit<ShiftRecord, 'id'> & { id?: string } = {
                    user_id: userId,
                    date: date,
                    start_time: cell.start_time || '00:00',
                    end_time: cell.end_time || '00:00',
                    location: store.name,
                    status: publishAll ? 'published' : (cell.status || 'published'),
                    planned_wake_up_time: cell.planned_wake_up_time || null,
                    planned_leave_time: cell.planned_leave_time || null,
                    daily_memo: cell.daily_memo || null
                };
                if (cell.shiftId) {
                    shiftData.id = cell.shiftId;
                }
                upserts.push(shiftData);
            }
        });

        if (conflicts.length > 0) {
            const proceed = window.confirm(`警告:\n${conflicts.join('\n')}\n\nこのまま保存しますか？`);
            if (!proceed) {
                setIsSaving(false);
                return;
            }
        }

        try {
            if (deletes.length > 0) {
                await bulkDeleteShifts(deletes);
            }
            if (upserts.length > 0) {
                await bulkUpsertShifts(upserts);
            }

            // After save, reset isModified
            setGridState(prev => {
                const next = { ...prev };
                Object.keys(next).forEach(key => {
                    next[key] = { ...next[key], isModified: false };
                });
                return next;
            });

            alert('保存が完了しました');
            // Refresh initial data to get new IDs
            window.location.reload();
        } catch (error) {
            console.error('Save error:', error);
            alert('保存中にエラーが発生しました');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePublishAll = () => {
        if (!hasUnsavedChanges() && draftShiftsCount > 0) {
            if (window.confirm('すべての下書きのシフトを公開しますか？')) {
                handleSaveAll(true);
            }
        }
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

    const unsavedChangesCount = Object.values(gridState).filter(c => c.isModified || c.isDeleted).length;
    const draftShiftsCount = Object.values(gridState).filter(c => c.status === 'draft' && !c.isDeleted).length;
    const publishedShiftsCount = Object.values(gridState).filter(c => c.shiftId && c.status === 'published' && !c.isDeleted).length;

    const filteredUsers = users.filter(user => {
        // 1. Text Search Filter
        if (searchQuery && !user.display_name.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }

        // 2. Display Mode Filter
        if (showAllStaff) return true;
        if (store?.affiliated_staff?.includes(user.id)) return true;

        // 3. Auto-show users who have at least one active shift in the current view
        return dates.some(d => {
            const key = `${user.id}_${d.dateStr}`;
            const cell = gridState[key];
            return cell && (cell.start_time || cell.end_time) && !cell.isDeleted;
        });
    });

    return (
        <div className="h-[calc(100vh-theme(spacing.24))] flex flex-col">
            {/* ヘッダー領域 */}
            <div className="flex-none mb-4 space-y-4">
                <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-4">
                    <div className="flex items-start md:items-center gap-2 md:gap-4">
                        <button
                            onClick={() => {
                                if (!hasUnsavedChanges()) {
                                    router.push(`/admin/shifts/${storeId}`);
                                } else {
                                    setPendingConfirm({
                                        message: '変更が破棄されます。戻りますか？',
                                        action: () => router.push(`/admin/shifts/${storeId}`)
                                    });
                                }
                            }}
                            className="p-1.5 md:p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm shrink-0"
                        >
                            <ArrowLeft size={20} className="text-gray-600" />
                        </button>
                        <div className="overflow-hidden">
                            <h1 className="text-lg md:text-2xl font-bold text-gray-800 flex items-center gap-2 md:gap-3 flex-wrap">
                                <span className="whitespace-nowrap">シフトビルダー</span>
                                <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 md:py-1 rounded-md text-xs md:text-sm border border-indigo-100 flex items-center gap-1 whitespace-nowrap">
                                    <Building2 size={12} className="md:w-3.5 md:h-3.5" /> {store.name}
                                </span>
                            </h1>
                            <p className="text-xs text-gray-500 font-bold mt-1 hidden md:block">
                                マウスとキーボードでエクセルのように高速入力。変更後は右上の「保存」を押してください。
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3 flex-wrap justify-end">
                        <div className="flex items-center bg-white border border-gray-200 rounded-lg p-0.5 md:p-1 shadow-sm mr-1 md:mr-4 shrink-0">
                            <button onClick={handlePrevMonth} className="px-2 md:px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors">
                                <ChevronLeft size={16} />
                            </button>
                            <span className="font-bold text-gray-800 px-2 md:px-4 text-sm md:text-base whitespace-nowrap">
                                {year}年 {month + 1}月
                            </span>
                            <button onClick={handleNextMonth} className="px-2 md:px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors">
                                <ChevronRight size={16} />
                            </button>
                            <div className="flex bg-gray-100 rounded-lg p-0.5 ml-2">
                                <button
                                    onClick={() => setViewMode('calendar')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'calendar' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <CalendarIcon size={14} /> カレンダー
                                </button>
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'grid' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <LayoutGrid size={14} /> グリッド
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Preview Mode Toggle (Essential for Intuition) */}
                            <button
                                onClick={() => setIsPreviewMode(!isPreviewMode)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-black transition-all border shadow-sm ${isPreviewMode
                                    ? 'bg-indigo-600 border-indigo-600 text-white ring-2 ring-indigo-200'
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                    }`}
                                title="スタッフが見ている画面を表示します（下書きを非表示）"
                            >
                                {isPreviewMode ? <div className="w-2 h-2 rounded-full bg-white animate-pulse" /> : <div className="w-2 h-2 rounded-full bg-gray-300" />}
                                <span>{isPreviewMode ? 'プレビュー中' : 'スタッフ視点を確認'}</span>
                            </button>

                            {/* Unsaved Changes Indicator */}
                            {unsavedChangesCount > 0 && (
                                <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-2 rounded-lg border border-red-200 animate-pulse shrink-0">
                                    <AlertCircle size={16} />
                                    <span className="text-xs font-black uppercase">未保存 {unsavedChangesCount}件</span>
                                </div>
                            )}

                            <button
                                onClick={() => setShowAllStaff(!showAllStaff)}
                                className={`flex shrink-0 whitespace-nowrap justify-center items-center gap-1 md:gap-2 px-3 md:px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm border ${showAllStaff
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                    }`}
                                title="全スタッフ表示切替"
                            >
                                <UserCircle2 size={16} />
                                <span className="hidden sm:inline">{showAllStaff ? '全スタッフ表示中' : '所属スタッフ優先'}</span>
                            </button>

                            <div className="relative shrink-0">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                <input
                                    type="text"
                                    placeholder="名前で検索..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8 pr-3 py-2 w-32 md:w-48 rounded-lg text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm transition-all bg-white"
                                />
                            </div>

                            <button
                                onClick={() => {
                                    setIsStampMode(!isStampMode);
                                    if (isStampMode) setCopiedTime(null);
                                }}
                                className={`flex shrink-0 whitespace-nowrap justify-center items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm border ${isStampMode
                                    ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                    }`}
                                title="連続入力モード"
                            >
                                <Copy size={16} />
                                <span className="hidden sm:inline">スタンプモード</span>
                            </button>

                            <button
                                onClick={() => handleSaveAll(false)}
                                disabled={isSaving || unsavedChangesCount === 0}
                                className={`flex justify-center items-center gap-1 md:gap-2 px-3 md:px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-sm shrink-0 whitespace-nowrap ${isSaving || unsavedChangesCount === 0
                                    ? 'bg-gray-100 border-gray-200 text-gray-400'
                                    : 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 hover:scale-105'
                                    }`}
                            >
                                {isSaving ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Save size={16} />}
                                <span className="hidden sm:inline">{isSaving ? '保存中...' : '下書きとして保存'}</span>
                            </button>

                            <button
                                onClick={() => {
                                    if (window.confirm('確定してスタッフへ公開します。よろしいですか？')) {
                                        handleSaveAll(true);
                                    }
                                }}
                                disabled={isSaving || (unsavedChangesCount === 0 && draftShiftsCount === 0)}
                                className={`flex shrink-0 whitespace-nowrap justify-center items-center gap-1 md:gap-2 px-3 md:px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-sm border ${isSaving || (unsavedChangesCount === 0 && draftShiftsCount === 0)
                                    ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700 hover:scale-105'
                                    }`}
                                title="すべての編集内容と下書きを確定し、スタッフへ公開"
                            >
                                <Send size={16} />
                                <span className="hidden sm:inline">確定して公開</span>
                            </button>
                        </div>
                    </div>
                </div>

                {copiedTime && (
                    <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs px-3 py-2 rounded-lg flex items-center gap-2 max-w-sm">
                        <span className="font-bold">コピー中:</span> {copiedTime.start} 〜 {copiedTime.end}
                        <button onClick={() => setCopiedTime(null)} className="ml-auto text-blue-400 hover:text-blue-600"><X size={14} /></button>
                    </div>
                )}

                {/* シフトプリセット (NEW) */}
                <div className="px-4 pb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                <Clock size={12} /> プリセット:
                            </span>
                            <button
                                onClick={() => setIsPresetModalOpen(true)}
                                className="flex items-center gap-1 px-2 py-1 hover:bg-emerald-50 rounded text-gray-500 hover:text-emerald-600 transition-colors border border-transparent hover:border-emerald-200"
                                title="プリセットを編集"
                            >
                                <Settings2 size={14} />
                                <span className="text-[10px] font-bold">配色・編集</span>
                            </button>
                        </div>
                        {storePresets.map((p, idx) => (
                            // ... (preset buttons)
                            <button
                                key={p.label + idx}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (activePresetIndex === idx) {
                                        setActivePresetIndex(null);
                                        setCopiedTime(null);
                                        setIsStampMode(false);
                                    } else {
                                        setActivePresetIndex(idx);
                                        setCopiedTime({ start: p.start, end: p.end });
                                        setIsStampMode(true);
                                    }
                                }}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${p.color} ${activePresetIndex === idx
                                    ? `ring-2 ring-emerald-500 ring-offset-1 scale-105 shadow-md`
                                    : 'opacity-80 hover:opacity-100 shadow-sm'
                                    }`}
                            >
                                {p.label}
                            </button>
                        ))}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (activePresetIndex === 999) {
                                    setActivePresetIndex(null);
                                    setCopiedTime(null);
                                    setIsStampMode(false);
                                } else {
                                    setActivePresetIndex(999);
                                    setCopiedTime({ start: 'delete', end: 'delete' });
                                    setIsStampMode(true);
                                }
                            }}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${activePresetIndex === 999
                                ? `bg-red-50 text-red-600 border-red-300 border-dashed ring-2 ring-red-500 ring-offset-1 scale-105 shadow-sm`
                                : 'bg-white border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500'
                                }`}
                        >
                            ✖️ 消去 <span className="text-[9px] font-normal opacity-70">(削除)</span>
                        </button>

                        <div className="flex items-center gap-4 bg-gray-50/50 px-3 py-1 rounded-full border border-gray-100 ml-auto hidden sm:flex">
                            <span className="text-[9px] font-black text-gray-400 uppercase">表示凡例:</span>
                            <div className="flex items-center gap-1.5">
                                <div
                                    className="w-2.5 h-2.5 bg-blue-100 border border-blue-300 border-dashed rounded"
                                    style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 4px)' }}
                                ></div>
                                <span className="text-[10px] text-gray-500 font-bold">下書き（斜線/透かし）</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 bg-emerald-100 border border-emerald-300 rounded"></div>
                                <span className="text-[10px] text-gray-500 font-bold">公開済み（塗りつぶし）</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {viewMode === 'grid' ? (
                <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                    <div className="overflow-auto flex-1 h-full custom-scrollbar">
                        <table className="w-full border-collapse border-spacing-0 relative text-xs">
                            {/* ヘッダー行：日付 */}
                            <thead className="sticky top-0 z-20 bg-gray-50 shadow-sm">
                                <tr>
                                    <th className="sticky left-0 z-30 bg-gray-100/90 backdrop-blur border-b border-r border-gray-200 p-3 w-40 min-w-[160px] text-left text-gray-600 font-bold shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                        スタッフ ＼ 日付
                                    </th>
                                    {dates.map(d => (
                                        <th key={d.dateStr} className={`border-b border-r border-gray-200 p-2 min-w-[100px] text-center
                                        ${d.weekday === 0 ? 'bg-red-50 text-red-600' : d.weekday === 6 ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}
                                    `}>
                                            <div className="font-bold text-sm">{d.day}</div>
                                            <div className="text-[10px]">{weekdays[d.weekday]}</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            {/* ボディ：スタッフ行ごと */}
                            <tbody className="bg-white">
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={dates.length + 1} className="p-8 text-center text-gray-500 bg-gray-50/50">
                                            <p className="font-bold">該当するスタッフが見つかりません</p>
                                            <p className="text-xs mt-1 text-gray-400">検索条件を変更するか、「全スタッフ表示」に切り替えてください。</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map(user => {
                                        const isAffiliated = store?.affiliated_staff?.includes(user.id);
                                        return (
                                            <tr key={user.id} className="hover:bg-blue-50/20 group">
                                                {/* 固定列：スタッフ名 */}
                                                <td className="sticky left-0 z-10 bg-white group-hover:bg-gray-50 border-b border-r border-gray-200 p-3 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                                    <div className="flex items-center gap-2">
                                                        {isAffiliated ? (
                                                            <div className="w-4 h-4 rounded bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0" title="所属スタッフ">
                                                                <span className="text-[10px] font-bold">属</span>
                                                            </div>
                                                        ) : (
                                                            <UserCircle2 size={16} className="text-gray-400 flex-shrink-0" />
                                                        )}
                                                        <span className={`font-bold truncate ${isAffiliated ? 'text-emerald-800' : 'text-gray-700'}`}>{user.display_name}</span>
                                                    </div>
                                                </td>

                                                {/* 日付セル群 */}
                                                {dates.map(d => {
                                                    const key = `${user.id}_${d.dateStr}`;
                                                    const cell = gridState[key];
                                                    const isEmpty = !cell || (!cell.start_time && !cell.end_time);
                                                    const isDeleted = cell?.isDeleted;
                                                    const isModified = cell?.isModified;

                                                    // Preview Mode: Hide Drafts
                                                    if (isPreviewMode && cell?.status === 'draft') {
                                                        return <td key={d.dateStr} className="border-b border-r border-gray-50 bg-gray-50/20" />;
                                                    }

                                                    return (
                                                        <td key={d.dateStr}
                                                            className={`border-b border-r border-gray-200 p-1 relative transition-colors
                                                                ${isDeleted ? 'bg-gray-100 opacity-50' : getCellStyle(user.id, d.dateStr, cell)}
                                                                ${isModified && !isDeleted ? 'z-10' : 'z-0'}
                                                            `}
                                                            onMouseEnter={(e) => {
                                                                if (isStampMode && e.buttons === 1 && activePresetIndex !== null) {
                                                                    pastePreset(user.id, d.dateStr, activePresetIndex);
                                                                } else if (isStampMode && e.buttons === 1 && copiedTime) {
                                                                    pasteCell(user.id, d.dateStr);
                                                                }
                                                            }}
                                                            onClick={(e) => {
                                                                if (isStampMode) {
                                                                    if (activePresetIndex !== null) {
                                                                        pastePreset(user.id, d.dateStr, activePresetIndex);
                                                                    } else if (copiedTime) {
                                                                        pasteCell(user.id, d.dateStr);
                                                                    } else if (!isEmpty) {
                                                                        copyCell(user.id, d.dateStr);
                                                                    }
                                                                } else {
                                                                    setSelectedDateForDetails(d.dateStr);
                                                                    setIsDayDetailsModalOpen(true);
                                                                }
                                                            }}
                                                        >
                                                            {/* 未保存インジケータ (Border Highlight + Pencil) */}
                                                            {isModified && !isDeleted && (
                                                                <>
                                                                    <div className="absolute inset-0 ring-2 ring-inset ring-amber-400 pointer-events-none z-10 rounded-sm" />
                                                                    <div className="absolute top-0 right-0 -mt-1 -mr-1 text-amber-600 drop-shadow-sm bg-white rounded-full p-[1px] z-20 border border-amber-200" title="未保存の変更">
                                                                        <Pencil size={10} />
                                                                    </div>
                                                                </>
                                                            )}

                                                            {/* 希望休インジケータ */}
                                                            {(() => {
                                                                const h = holidays.find(req => req.user_id === user.id && req.date === d.dateStr);
                                                                if (!h) return null;
                                                                return (
                                                                    <div className="absolute top-0 left-0 right-0 z-10">
                                                                        <div className={`text-[8px] font-black py-0.5 px-1 truncate text-center shadow-sm border-b
                                                                        ${h.status === 'PENDING' ? 'bg-amber-100/90 text-amber-700 border-amber-200' : 'bg-red-50/90 text-red-700 border-red-200'}
                                                                    `}>
                                                                            希望休 {h.status === 'PENDING' ? '(未承認)' : ''}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}

                                                            <div className="flex flex-col gap-1 w-full justify-center mt-2">
                                                                <input
                                                                    type="time"
                                                                    value={isDeleted ? '' : cell?.start_time || ''}
                                                                    onChange={(e) => handleCellChange(user.id, d.dateStr, 'start_time', e.target.value)}
                                                                    className={`w-[85px] mx-auto text-[11px] p-0.5 border border-transparent hover:border-gray-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded bg-transparent text-center transition-colors ${isStampMode ? 'pointer-events-none' : ''}`}
                                                                    readOnly={isStampMode}
                                                                />
                                                                <input
                                                                    type="time"
                                                                    value={isDeleted ? '' : cell?.end_time || ''}
                                                                    onChange={(e) => handleCellChange(user.id, d.dateStr, 'end_time', e.target.value)}
                                                                    className={`w-[85px] mx-auto text-[11px] p-0.5 border border-transparent hover:border-gray-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded bg-transparent text-center transition-colors ${isStampMode ? 'pointer-events-none' : ''}`}
                                                                    readOnly={isStampMode}
                                                                />
                                                            </div>

                                                            {/* 削除（クリア）ボタン。スマホでも見えるように調整 */}
                                                            {!isEmpty && !isDeleted && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        clearCell(user.id, d.dateStr);
                                                                    }}
                                                                    className="absolute top-0.5 right-0.5 sm:opacity-0 opacity-100 group-hover:opacity-100 hover:text-red-500 text-gray-400 transition-opacity bg-white/90 rounded shadow-sm"
                                                                    title="シフトを削除"
                                                                >
                                                                    <X size={12} />
                                                                </button>
                                                            )}

                                                            {/* 状態インジケータ */}
                                                            {isModified && !isDeleted && (
                                                                <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500" title="未保存の変更" />
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col p-4">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4 border-b border-gray-100 pb-4">
                        <div className="flex items-center gap-3">
                            <div className={`${isStampMode ? 'bg-emerald-50' : 'bg-indigo-50'} p-2 rounded-lg transition-colors`}>
                                {isStampMode ? (
                                    <UserCircle2 className="text-emerald-600" size={20} />
                                ) : (
                                    <CalendarIcon className="text-indigo-600" size={20} />
                                )}
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-800">
                                    {isStampMode ? 'カレンダー・スタンプモード' : 'カレンダー・月間表示'}
                                </h3>
                                <p className="text-[10px] text-gray-500">
                                    {isStampMode
                                        ? 'スタッフを選んで日付をタップすると、選択中のプリセットが入力されます。'
                                        : '各日付の出勤スタッフと店合計人数を確認できます。スタンプモードで一括入力も可能です。'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-500">操作対象:</span>
                            <select
                                value={selectedUserForCalendar?.id || ''}
                                onChange={(e) => {
                                    const u = users.find(u => u.id === e.target.value);
                                    setSelectedUserForCalendar(u || null);
                                }}
                                className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            >
                                <option value="">スタッフを選択してください</option>
                                {filteredUsers.map(u => (
                                    <option key={u.id} value={u.id}>{u.display_name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto">
                        <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                            {weekdays.map(w => (
                                <div key={w} className={`p-2 text-center text-[10px] font-bold uppercase tracking-wider ${w === '日' ? 'text-red-500' : w === '土' ? 'text-blue-500' : 'text-gray-500'} bg-gray-50`}>
                                    {w}
                                </div>
                            ))}
                            {(() => {
                                const firstDay = new Date(year, month, 1).getDay();
                                const emptyDays = Array.from({ length: firstDay }, (_, i) => i);
                                return (
                                    <>
                                        {emptyDays.map(i => <div key={`empty-${i}`} className="bg-gray-50/50 min-h-[100px]" />)}
                                        {dates.map(d => {
                                            const shiftCount = selectedUserForCalendar ? (() => {
                                                const key = `${selectedUserForCalendar.id}_${d.dateStr}`;
                                                const cell = gridState[key];
                                                // Consider it a shift if start_time exists OR it's been modified (placeholders)
                                                return (cell && !cell.isDeleted && (cell.start_time || cell.isModified)) ? 1 : 0;
                                            })() : 0;

                                            const totalShiftsToday = users.reduce((acc, u) => {
                                                const key = `${u.id}_${d.dateStr}`;
                                                const cell = gridState[key];
                                                return acc + ((cell && !cell.isDeleted && (cell.start_time || cell.isModified)) ? 1 : 0);
                                            }, 0);

                                            return (
                                                <div
                                                    key={d.dateStr}
                                                    onClick={() => handleCalendarDateClick(d.dateStr)}
                                                    className={`bg-white min-h-[90px] sm:min-h-[110px] p-1 sm:p-2 hover:bg-emerald-50 transition-colors cursor-pointer relative group
                                                        ${d.weekday === 0 ? 'bg-red-50/20' : d.weekday === 6 ? 'bg-blue-50/20' : ''}
                                                    `}
                                                >
                                                    <div className={`text-xs sm:text-sm font-bold mb-0.5 sm:mb-1 flex items-center gap-1 ${d.weekday === 0 ? 'text-red-600' : d.weekday === 6 ? 'text-blue-600' : 'text-gray-700'}`}>
                                                        {d.day}
                                                        {users.some(u => gridState[`${u.id}_${d.dateStr}`]?.isModified && !gridState[`${u.id}_${d.dateStr}`]?.isDeleted) && (
                                                            <div className="bg-amber-100 text-amber-600 rounded px-1 flex items-center gap-0.5" title="未保存の変更があります">
                                                                <Pencil size={10} />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="space-y-0.5 sm:space-y-1 overflow-y-auto max-h-[60px] sm:max-h-[80px] custom-scrollbar pb-4">
                                                        {users.map(u => {
                                                            const key = `${u.id}_${d.dateStr}`;
                                                            const cell = gridState[key];

                                                            // Preview Mode: Hide Drafts
                                                            if (isPreviewMode && cell?.status === 'draft') return null;

                                                            const originalShift = allMonthlyShifts.find(s => s.id === cell?.shiftId);
                                                            let originalDisplayTime = '未定';
                                                            if (originalShift && originalShift.start_time && originalShift.start_time !== '00:00') {
                                                                originalDisplayTime = originalShift.start_time.substring(0, 5);
                                                            }

                                                            const hasShift = cell && ((!cell.isDeleted && (cell.start_time || cell.isModified)) || (cell.isDeleted && cell.shiftId));
                                                            if (!hasShift) return null;

                                                            const isSelected = selectedUserForCalendar?.id === u.id;
                                                            const displayTime = cell.isDeleted ? '削除' : ((cell.start_time && cell.start_time !== '00:00') ? cell.start_time : '未定');
                                                            const isEdited = cell.isModified;

                                                            return (
                                                                <div
                                                                    key={u.id}
                                                                    className={`text-[8px] sm:text-[9px] px-1 py-0.5 rounded border leading-tight transition-all relative
                                                                            ${isSelected ? 'ring-2 ring-emerald-500 ring-offset-0 z-10 font-black shadow-sm' : ''}
                                                                            ${getCellStyle(u.id, d.dateStr, cell)}
                                                                        `}
                                                                    title={`${u.display_name}: ${cell.start_time || '未定'}〜${cell.end_time || '未定'}`}
                                                                >
                                                                    {isEdited ? (
                                                                        <div className="flex flex-col gap-0.5 items-center justify-center h-full">
                                                                            {cell.shiftId && !cell.isDeleted && (
                                                                                <div className="flex items-center opacity-60 line-through truncate w-full justify-center">
                                                                                    <span className="hidden sm:inline mr-1">{u.display_name.split(' ')[0]}</span>
                                                                                    <span className="sm:hidden mr-1">{u.display_name.charAt(0)}</span>
                                                                                </div>
                                                                            )}
                                                                            {cell.shiftId && !cell.isDeleted && (
                                                                                <div className="text-center text-amber-600 font-bold text-[8px] leading-none">↓</div>
                                                                            )}
                                                                            <div className="flex items-center justify-center truncate text-amber-700 font-bold w-full">
                                                                                <span className="hidden sm:inline mr-1">{u.display_name.split(' ')[0]}</span>
                                                                                <span className="sm:hidden mr-1">{u.display_name.charAt(0)}</span>
                                                                                {cell.isDeleted && <span>(削除)</span>}
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex justify-center items-center truncate h-full">
                                                                            <span className="opacity-90 hidden sm:inline mr-1 font-bold">{u.display_name.split(' ')[0]}</span>
                                                                            <span className="opacity-90 sm:hidden mr-1 font-bold">{u.display_name.charAt(0)}</span>
                                                                            {cell.isDeleted && <span>(削除)</span>}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}

                                                        {totalShiftsToday === 0 && (
                                                            <div className="text-[8px] sm:text-[9px] text-gray-300 italic py-0.5">0名</div>
                                                        )}
                                                        {totalShiftsToday > 0 && (
                                                            <div className="text-[8px] sm:text-[9px] text-gray-400 mt-0.5 font-bold">
                                                                <span className="hidden sm:inline">店合計: </span><span className="text-gray-700">{totalShiftsToday}名</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {holidays.filter(h => h.date === d.dateStr).length > 0 && (
                                                        <div className="absolute bottom-1 right-1 flex -space-x-1">
                                                            {holidays.filter(h => h.date === d.dateStr).slice(0, 3).map((h, i) => (
                                                                <div key={i} className="w-2 h-2 rounded-full bg-amber-400 border border-white" title="希望休あり" />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* プリセット編集モーダル */}
            {isPresetModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Settings2 className="text-emerald-500" size={20} /> プリセット設定
                            </h3>
                            <button onClick={() => setIsPresetModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-xs text-gray-500 mb-4">
                                店舗ごとに独自のシフトパターン（早番、中番など）を設定できます。
                                保存すると、この店舗のシフト作成時に反映されます。
                            </p>
                            {storePresets.map((p, idx) => (
                                <div key={idx} className="p-4 rounded-xl border border-gray-100 bg-gray-50/30 space-y-3 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${p.color?.split(' ')[0] || 'bg-gray-400'}`} />
                                        <input
                                            type="text"
                                            value={p.label}
                                            onChange={(e) => {
                                                const newPresets = [...storePresets];
                                                newPresets[idx] = { ...p, label: e.target.value };
                                                setStorePresets(newPresets);
                                            }}
                                            placeholder="ラベル (例: 早番)"
                                            className="flex-1 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-emerald-500 focus:outline-none font-bold text-sm py-0.5 transition-colors"
                                        />
                                        <button
                                            onClick={() => {
                                                const newPresets = storePresets.filter((_, i) => i !== idx);
                                                setStorePresets(newPresets);
                                            }}
                                            className="text-gray-300 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-4 ml-6">
                                        <div className="flex-1 flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">開始</span>
                                            <input
                                                type="time"
                                                value={p.start}
                                                onChange={(e) => {
                                                    const newPresets = [...storePresets];
                                                    newPresets[idx] = { ...p, start: e.target.value };
                                                    setStorePresets(newPresets);
                                                }}
                                                className="flex-1 text-sm bg-white border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                            />
                                        </div>
                                        <div className="flex-1 flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">終了</span>
                                            <input
                                                type="time"
                                                value={p.end}
                                                onChange={(e) => {
                                                    const newPresets = [...storePresets];
                                                    newPresets[idx] = { ...p, end: e.target.value };
                                                    setStorePresets(newPresets);
                                                }}
                                                className="flex-1 text-sm bg-white border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 ml-6 pt-1">
                                        {PRESET_COLOR_OPTIONS.map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => {
                                                    const newPresets = [...storePresets];
                                                    newPresets[idx] = { ...p, color: opt.value };
                                                    setStorePresets(newPresets);
                                                }}
                                                className={`w-5 h-5 rounded-full border-2 transition-all ${opt.value.split(' ')[0]} ${p.color === opt.value ? 'border-gray-800 scale-110 shadow-md' : 'border-transparent hover:scale-110'}`}
                                                title={opt.name}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <button
                                onClick={() => {
                                    setStorePresets([...storePresets, { label: '新規', start: '10:00', end: '19:00', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }]);
                                }}
                                className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:text-emerald-500 hover:border-emerald-200 transition-all flex items-center justify-center gap-2 text-sm font-bold"
                            >
                                <Plus size={16} /> プリセットを追加
                            </button>
                        </div>
                        <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
                            <button
                                onClick={() => setIsPresetModalOpen(false)}
                                className="flex-1 py-2.5 rounded-xl font-bold text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={() => handleSavePresets(storePresets)}
                                className="flex-1 py-2.5 rounded-xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
                            >
                                設定を保存
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Confirm Modal */}
            {pendingConfirm && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-5 text-center">
                            <h3 className="text-lg font-bold text-gray-800 mb-2">確認</h3>
                            <p className="text-sm text-gray-600 font-medium leading-relaxed">{pendingConfirm.message}</p>
                        </div>
                        <div className="flex border-t border-gray-100">
                            <button
                                onClick={() => setPendingConfirm(null)}
                                className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 transition-colors border-r border-gray-100"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={() => {
                                    pendingConfirm.action();
                                    setPendingConfirm(null);
                                }}
                                className="flex-1 py-3 text-red-500 font-bold hover:bg-red-50 transition-colors"
                            >
                                実行
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
            {isDayDetailsModalOpen && selectedDateForDetails && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-emerald-600 p-4 text-white flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg">
                                    {selectedDateForDetails.split('-')[1]}月{selectedDateForDetails.split('-')[2]}日の出勤状況
                                </h3>
                                <p className="text-xs opacity-90">{store?.name || '店舗'} - 月間カレンダー詳細</p>
                            </div>
                            <button
                                onClick={() => setIsDayDetailsModalOpen(false)}
                                className="p-2 hover:bg-emerald-500 rounded-lg transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-4">
                                {(() => {
                                    const dailyShifts = users.filter(u => {
                                        const key = `${u.id}_${selectedDateForDetails}`;
                                        const cell = gridState[key];
                                        return cell && !cell.isDeleted && (cell.start_time || cell.isModified);
                                    });

                                    if (dailyShifts.length === 0) {
                                        return (
                                            <div className="text-center py-8 text-gray-400">
                                                <CalendarIcon size={48} className="mx-auto mb-2 opacity-20" />
                                                <p>この日の出勤予定はありません</p>
                                            </div>
                                        );
                                    }

                                    return dailyShifts.map(u => {
                                        const key = `${u.id}_${selectedDateForDetails}`;
                                        const cell = gridState[key];
                                        const displayTime = (cell.start_time && cell.start_time !== '00:00') ? `${cell.start_time} 〜 ${cell.end_time || '未定'}` : '未定';

                                        return (
                                            <div key={u.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 text-emerald-600">
                                                            <UserCircle2 size={24} />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-gray-800 text-lg">{u.display_name}</div>
                                                            <div className="text-sm font-bold text-emerald-600 px-2 py-0.5 bg-emerald-50 rounded-lg inline-block">{displayTime}</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={`text-[10px] font-black px-2 py-1 rounded-full border ${cell.status === 'draft' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                                            {cell.status === 'draft' ? '下書き' : '公開済'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-1">
                                                            <Clock size={12} /> 起床予定
                                                        </label>
                                                        <div className="w-full text-sm font-bold text-gray-700 bg-white border border-gray-100 rounded-lg px-3 py-2 h-10 flex items-center">
                                                            {cell.planned_wake_up_time || <span className="text-gray-300 font-normal">未設定</span>}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-1">
                                                            <Send size={12} /> 出発予定
                                                        </label>
                                                        <div className="w-full text-sm font-bold text-gray-700 bg-white border border-gray-100 rounded-lg px-3 py-2 h-10 flex items-center">
                                                            {cell.planned_leave_time || <span className="text-gray-300 font-normal">未設定</span>}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase">備考 (ユーザー入力)</label>
                                                    <div className="w-full text-sm text-gray-700 bg-white border border-gray-100 rounded-lg px-3 py-2 min-h-[60px] whitespace-pre-wrap leading-relaxed">
                                                        {cell.daily_memo || <span className="text-gray-300">メモなし</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                            <button
                                onClick={() => setIsDayDetailsModalOpen(false)}
                                className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-colors"
                            >
                                閉じる
                            </button>
                            <button
                                onClick={() => {
                                    setIsDayDetailsModalOpen(false);
                                    setIsStampMode(true);
                                }}
                                className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
                            >
                                スタンプモードへ
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .staging-stripes {
                    background-image: repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.4) 5px, rgba(255,255,255,0.4) 10px) !important;
                }
            `}</style>
        </div>
    );
}
