"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Save, X, Building2, UserCircle2, ArrowLeft, Copy, Search } from 'lucide-react';
import { getAllShifts, getAllStores, getAllUsers, StoreRecord, AdminUserRecord, bulkUpsertShifts, bulkDeleteShifts } from '@/lib/api/admin';

type ShiftRecord = {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    location: string;
    user_id: string;
};

// State mapping for the grid: { "userId_YYYY-MM-DD": { start_time, end_time, shiftId?, isModified?, isDeleted? } }
type GridState = Record<string, { start_time: string; end_time: string; shiftId?: string; isModified?: boolean; isDeleted?: boolean }>;

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

    // UI states
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [copiedTime, setCopiedTime] = useState<{ start: string, end: string } | null>(null);
    const [isStampMode, setIsStampMode] = useState(false);
    const [showAllStaff, setShowAllStaff] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [pendingConfirm, setPendingConfirm] = useState<{ message: string, action: () => void } | null>(null);

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

            const [storeRes, userRes, shiftRes] = await Promise.all([
                getAllStores(),
                getAllUsers(),
                getAllShifts(ym)
            ]);

            if (storeRes.success && storeRes.data) {
                const foundStore = storeRes.data.find(s => s.id === storeId);
                setStore(foundStore || null);

                if (foundStore && shiftRes.success && shiftRes.data) {
                    const storeShifts = shiftRes.data.filter(s => s.location === foundStore.name);
                    setOriginalShifts(storeShifts);

                    // Initialize grid state
                    const initialGrid: GridState = {};
                    storeShifts.forEach(s => {
                        const key = `${s.user_id}_${s.date}`;
                        initialGrid[key] = { start_time: s.start_time.slice(0, 5), end_time: s.end_time.slice(0, 5), shiftId: s.id, isModified: false, isDeleted: false };
                    });
                    setGridState(initialGrid);
                }
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

    const handleCellChange = (userId: string, dateStr: string, field: 'start_time' | 'end_time', value: string) => {
        const key = `${userId}_${dateStr}`;
        setGridState(prev => {
            const currentCell = prev[key] || { start_time: '', end_time: '' };
            return {
                ...prev,
                [key]: {
                    ...currentCell,
                    [field]: value,
                    isModified: true,
                    isDeleted: false // if they are typing, un-delete it
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
        setGridState(prev => ({
            ...prev,
            [key]: {
                ...(prev[key] || {}),
                start_time: copiedTime.start,
                end_time: copiedTime.end,
                isModified: true,
                isDeleted: false
            }
        }));
    };

    const handleSaveAll = async () => {
        if (!store) return;
        setIsSaving(true);

        const upserts: (Omit<ShiftRecord, 'id'> & { id?: string })[] = [];
        const deletes: string[] = [];

        Object.entries(gridState).forEach(([key, cell]) => {
            if (cell.isDeleted && cell.shiftId) {
                deletes.push(cell.shiftId);
            } else if (cell.isModified && cell.start_time && cell.end_time && !cell.isDeleted) {
                const [userId, date] = key.split('_');
                const shiftData: Omit<ShiftRecord, 'id'> & { id?: string } = {
                    user_id: userId,
                    date: date,
                    start_time: cell.start_time,
                    end_time: cell.end_time,
                    location: store.name
                };
                if (cell.shiftId) {
                    shiftData.id = cell.shiftId;
                }
                upserts.push(shiftData);
            }
        });

        try {
            if (deletes.length > 0) {
                await bulkDeleteShifts(deletes);
            }
            if (upserts.length > 0) {
                await bulkUpsertShifts(upserts);
            }
            alert('保存が完了しました');
            // Hard reload the component data instead of full page
            const ym = `${year}-${String(month + 1).padStart(2, '0')}`;
            const shiftRes = await getAllShifts(ym);
            if (shiftRes.success && shiftRes.data) {
                const storeShifts = shiftRes.data.filter(s => s.location === store.name);
                setOriginalShifts(storeShifts);
                const newGrid: GridState = {};
                storeShifts.forEach(s => {
                    const key = `${s.user_id}_${s.date}`;
                    newGrid[key] = { start_time: s.start_time.slice(0, 5), end_time: s.end_time.slice(0, 5), shiftId: s.id, isModified: false, isDeleted: false };
                });
                setGridState(newGrid);
            }
        } catch (error) {
            alert('保存中にエラーが発生しました');
            console.error(error);
        } finally {
            setIsSaving(false);
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

                    <div className="flex items-center gap-2 md:gap-3 overflow-x-auto pb-1 w-full lg:w-auto">
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
                        </div>

                        {unsavedChangesCount > 0 && (
                            <span className="text-sm font-bold text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200 hidden md:inline-block shrink-0 whitespace-nowrap">
                                未保存: {unsavedChangesCount}件
                            </span>
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
                            onClick={handleSaveAll}
                            disabled={isSaving || unsavedChangesCount === 0}
                            className={`flex justify-center items-center gap-1 md:gap-2 px-3 md:px-6 py-2 rounded-lg text-sm font-bold transition-all shadow-sm shrink-0 whitespace-nowrap ${isSaving || unsavedChangesCount === 0
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-emerald-500 text-white hover:bg-emerald-600 hover:scale-105 active:scale-95'
                                }`}
                        >
                            {isSaving ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Save size={16} />}
                            <span className="hidden sm:inline">{isSaving ? '保存中...' : '一括保存を行う'}</span>
                            <span className="sm:hidden">{isSaving ? '保存中...' : '保存'}</span>
                        </button>
                    </div>
                </div>

                {copiedTime && (
                    <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs px-3 py-2 rounded-lg flex items-center gap-2 max-w-sm">
                        <span className="font-bold">コピー中:</span> {copiedTime.start} 〜 {copiedTime.end}
                        <button onClick={() => setCopiedTime(null)} className="ml-auto text-blue-400 hover:text-blue-600"><X size={14} /></button>
                    </div>
                )}
            </div>

            {/* グリッド領域 */}
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

                                                return (
                                                    <td key={d.dateStr}
                                                        className={`border-b border-r border-gray-200 p-1 relative
                                                    ${d.weekday === 0 ? 'bg-red-50/30' : d.weekday === 6 ? 'bg-blue-50/30' : ''}
                                                    ${isModified && !isDeleted ? 'bg-emerald-50/50' : ''}
                                                    ${isDeleted ? 'bg-gray-100 opacity-50' : ''}
                                                `}
                                                        onContextMenu={(e) => {
                                                            // 右クリックでコピー/ペースト
                                                            e.preventDefault();
                                                            if (copiedTime) {
                                                                pasteCell(user.id, d.dateStr);
                                                            } else if (!isEmpty) {
                                                                copyCell(user.id, d.dateStr);
                                                            }
                                                        }}
                                                        onClick={(e) => {
                                                            if (!isStampMode) return;
                                                            if (copiedTime) {
                                                                pasteCell(user.id, d.dateStr);
                                                            } else if (!isEmpty) {
                                                                copyCell(user.id, d.dateStr);
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex flex-col gap-1 w-full justify-center">
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
        </div>
    );
}
