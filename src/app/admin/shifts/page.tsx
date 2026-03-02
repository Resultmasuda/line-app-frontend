"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CalendarClock, Search, Filter, ChevronLeft, ChevronRight, Clock, MapPin, UserCheck, UserX, Sun, Navigation, Building2, Plus, Edit2, Trash2, X, Calendar as CalendarIcon, User as UserIcon } from 'lucide-react';
import { getAllShifts, getAllAttendances, getAllStores, createStore, updateStore, deleteStore, createShift, updateShift, deleteShift, StoreRecord, getAllUsers, AdminUserRecord } from '@/lib/api/admin';
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
    store_name?: string;
    location_lat?: number;
    location_lng?: number;
};

export default function AdminShiftsPage() {
    const [shifts, setShifts] = useState<ShiftRecord[]>([]);
    const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
    const [stores, setStores] = useState<StoreRecord[]>([]);
    const [users, setUsers] = useState<AdminUserRecord[]>([]);
    const [userFetchError, setUserFetchError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // シフト管理モーダル用
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [editingShift, setEditingShift] = useState<Partial<ShiftRecord> | null>(null);
    const [shiftFormError, setShiftFormError] = useState('');

    // 店舗管理モーダル用
    const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
    const [editingStore, setEditingStore] = useState<Partial<StoreRecord> | null>(null);
    const [storeFormError, setStoreFormError] = useState('');

    // 現在の表示月とタブ
    const [currentDate, setCurrentDate] = useState(new Date());
    const [activeTab, setActiveTab] = useState<'today' | 'tomorrow'>('today');

    // カスタム確認モーダル用
    const [pendingConfirm, setPendingConfirm] = useState<{ message: string, action: () => void } | null>(null);

    useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const ym = `${year}-${month}`;

            const [shiftRes, attRes, storeRes, userRes] = await Promise.all([
                getAllShifts(ym),
                getAllAttendances(ym),
                getAllStores(),
                getAllUsers()
            ]);

            if (shiftRes.success && shiftRes.data) {
                setShifts(shiftRes.data);
            } else {
                setShifts([]);
            }

            if (attRes.success && attRes.data) {
                setAttendances(attRes.data);
            } else {
                setAttendances([]);
            }

            if (storeRes.success && storeRes.data) {
                setStores(storeRes.data);
            } else {
                setStores([]);
            }

            if (userRes.success && userRes.data) {
                setUsers(userRes.data);
                setUserFetchError(null);
            } else {
                setUsers([]);
                setUserFetchError(JSON.stringify(userRes.error) || 'Unknown error');
            }

            setIsLoading(false);
        }
        fetchData();
    }, [currentDate]);

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const todayJST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    const tomorrowJST = new Date(todayJST.getTime() + 24 * 60 * 60 * 1000);
    const todayStr = todayJST.getFullYear() + '-' + String(todayJST.getMonth() + 1).padStart(2, '0') + '-' + String(todayJST.getDate()).padStart(2, '0');
    const tomorrowStr = tomorrowJST.getFullYear() + '-' + String(tomorrowJST.getMonth() + 1).padStart(2, '0') + '-' + String(tomorrowJST.getDate()).padStart(2, '0');

    const filteredShifts = shifts.filter(s => {
        const matchesSearch = (s.users?.display_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.location || '').toLowerCase().includes(searchQuery.toLowerCase());
        const targetDate = activeTab === 'today' ? todayStr : tomorrowStr;
        return matchesSearch && s.date === targetDate;
    }).sort((a, b) => new Date(`${a.date}T${a.start_time}`).getTime() - new Date(`${b.date}T${b.start_time}`).getTime());

    // 全ての店舗名を配列のキーとして初期化（シフトが0件でも表示するため）
    const groupedShifts = stores.reduce((acc, store) => {
        acc[store.name] = [];
        return acc;
    }, {} as Record<string, ShiftRecord[]>);

    // 実際のシフトを割り当て
    filteredShifts.forEach(shift => {
        const loc = shift.location || '店舗未定';
        if (!groupedShifts[loc]) groupedShifts[loc] = [];
        groupedShifts[loc].push(shift);
    });

    const storeNames = Object.keys(groupedShifts).sort();

    // ヘルパー: あるシフトに対する打刻履歴を取得
    const getShiftAttendances = (userId: string, date: string) => {
        return attendances.filter(a => a.user_id === userId && a.date === date);
    };

    // 店舗保存処理
    const handleSaveStore = async () => {
        if (!editingStore?.name) {
            setStoreFormError('店舗名を入力してください');
            return;
        }

        const payload = {
            name: editingStore.name,
            latitude: editingStore.latitude ? Number(editingStore.latitude) : null,
            longitude: editingStore.longitude ? Number(editingStore.longitude) : null,
            radius_m: editingStore.radius_m ? Number(editingStore.radius_m) : null,
            affiliated_staff: editingStore.affiliated_staff || []
        };

        if (editingStore.id) {
            const res = await updateStore(editingStore.id, payload);
            if (res.success) {
                setStores(stores.map(s => s.id === editingStore.id ? res.data! : s));
                setEditingStore(null);
            } else {
                setStoreFormError('更新に失敗しました');
            }
        } else {
            const res = await createStore(payload);
            if (res.success) {
                setStores([...stores, res.data!].sort((a, b) => a.name.localeCompare(b.name)));
                setEditingStore(null);
            } else {
                setStoreFormError('作成に失敗しました。店舗名が重複している可能性があります。');
            }
        }
    };

    // 店舗削除処理
    const handleDeleteStore = async (id: string, name: string) => {
        setPendingConfirm({
            message: `本当に店舗「${name}」を削除しますか？`,
            action: async () => {
                const res = await deleteStore(id);
                if (res.success) {
                    setStores(stores.filter(s => s.id !== id));
                } else {
                    alert('削除に失敗しました');
                }
            }
        });
    };

    // シフト保存処理
    const handleSaveShift = async () => {
        if (!editingShift?.user_id || !editingShift.date || !editingShift.start_time || !editingShift.end_time || !editingShift.location) {
            setShiftFormError('すべての項目を入力してください');
            return;
        }

        const payload = {
            user_id: editingShift.user_id,
            date: editingShift.date,
            start_time: editingShift.start_time,
            end_time: editingShift.end_time,
            location: editingShift.location
        };

        if (editingShift.id) {
            const res = await updateShift(editingShift.id, payload);
            if (res.success) {
                setShifts(shifts.map(s => s.id === editingShift.id ? res.data! : s));
                setEditingShift(null);
                setIsShiftModalOpen(false);
            } else {
                setShiftFormError('更新に失敗しました');
            }
        } else {
            const res = await createShift(payload);
            if (res.success) {
                setShifts([...shifts, res.data!]);
                setEditingShift(null);
                setIsShiftModalOpen(false);
            } else {
                setShiftFormError('作成に失敗しました。');
            }
        }
    };

    // シフト削除処理
    const handleDeleteShift = async (id: string) => {
        setPendingConfirm({
            message: '本当にこのシフトを削除しますか？',
            action: async () => {
                const res = await deleteShift(id);
                if (res.success) {
                    setShifts(shifts.filter(s => s.id !== id));
                } else {
                    alert('削除に失敗しました');
                }
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center max-w-6xl">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <CalendarClock className="text-emerald-500" size={28} />
                        シフト・勤怠管理
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        月ごとの全スタッフのシフトと実労働状況の確認
                    </p>
                </div>

                <div className="flex items-center bg-gray-100 p-1.5 rounded-xl shadow-inner border border-gray-200">
                    <button
                        onClick={() => setActiveTab('today')}
                        className={`px-8 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'today' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
                    >
                        本日 ({todayStr.slice(5).replace('-', '/')})
                    </button>
                    <button
                        onClick={() => setActiveTab('tomorrow')}
                        className={`px-8 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'tomorrow' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
                    >
                        明日 ({tomorrowStr.slice(5).replace('-', '/')})
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-w-6xl">
                {userFetchError && (
                    <div className="p-4 bg-red-100 text-red-700 font-bold">
                        API Error fetching users: {userFetchError}
                    </div>
                )}
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center bg-gray-50/50 gap-4">
                    <div className="relative w-full md:w-80 flex items-center gap-3">
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="スタッフ名・店舗で絞り込み..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button
                            onClick={() => {
                                const todayStr = currentDate.toISOString().split('T')[0];
                                setEditingShift({ date: todayStr, start_time: '10:00', end_time: '19:00', location: '' });
                                setIsShiftModalOpen(true);
                            }}
                            className="flex-1 md:flex-none justify-center flex items-center gap-2 px-3 py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-emerald-600 transition-colors"
                        >
                            <Plus size={16} />
                            シフトを作成
                        </button>
                        <button
                            onClick={() => setIsStoreModalOpen(true)}
                            className="flex-1 md:flex-none justify-center flex items-center gap-2 px-3 py-2 border border-emerald-200 text-emerald-600 bg-emerald-50 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-colors"
                        >
                            <Building2 size={16} />
                            店舗マスター管理
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto p-4">
                    {isLoading ? (
                        <div className="py-12 text-center text-gray-400">
                            <div className="flex justify-center mb-2">
                                <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
                            </div>
                            読み込み中...
                        </div>
                    ) : storeNames.length === 0 ? (
                        <div className="py-12 text-center text-gray-500 text-sm border rounded-xl border-gray-100 bg-gray-50/50">
                            登録されたシフトがありません
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {storeNames.map((store) => {
                                const storeObj = stores.find(s => s.name === store);
                                const storeId = storeObj ? storeObj.id : 'unknown';

                                return (
                                    <div key={store} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                        <div className="bg-indigo-50 px-4 py-3 flex items-center gap-4 border-b border-indigo-100 flex-wrap">
                                            <div className="flex items-center gap-2 -ml-2">
                                                <MapPin size={18} className="text-indigo-600 ml-2" />
                                                <h2 className="font-bold text-indigo-900">{store}</h2>
                                            </div>
                                            <span className="text-xs font-bold text-indigo-600 bg-white px-2 py-1 rounded-full shadow-sm">
                                                {groupedShifts[store].length} シフト
                                            </span>

                                            {/* シフトビルダーへの導線ボタン */}
                                            {storeObj && (
                                                <Link
                                                    href={`/admin/shifts/${storeId}/builder`}
                                                    className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg shadow-sm hover:bg-indigo-700 transition-colors"
                                                >
                                                    <CalendarIcon size={16} />
                                                    シフトビルダーを開く
                                                </Link>
                                            )}
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse min-w-[700px]">
                                                <thead>
                                                    <tr className="bg-gray-50/50 text-gray-500 text-[11px] uppercase tracking-wider">
                                                        <th className="px-6 py-3 font-semibold border-b border-gray-100 whitespace-nowrap">日付</th>
                                                        <th className="px-6 py-3 font-semibold border-b border-gray-100 whitespace-nowrap">スタッフ名</th>
                                                        <th className="px-6 py-3 font-semibold border-b border-gray-100 whitespace-nowrap">時間</th>
                                                        <th className="px-6 py-3 font-semibold border-b border-gray-100 whitespace-nowrap">出退勤状況</th>
                                                        <th className="px-6 py-3 font-semibold border-b border-gray-100 text-right whitespace-nowrap">操作</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 bg-white">
                                                    {groupedShifts[store].map((shift) => {
                                                        const dateStr = new Date(shift.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' });
                                                        const atts = getShiftAttendances(shift.user_id, shift.date);

                                                        const clockIn = atts.find(a => a.type === 'CLOCK_IN');
                                                        const clockOut = atts.find(a => a.type === 'CLOCK_OUT');
                                                        const wakeUp = atts.find(a => a.type === 'WAKE_UP');
                                                        const leave = atts.find(a => a.type === 'LEAVE');
                                                        const isFuture = new Date(shift.date) > new Date();

                                                        return (
                                                            <tr key={shift.id} className="group hover:bg-gray-50 transition-colors">
                                                                <td className="px-6 py-4 text-sm font-bold text-gray-700 whitespace-nowrap">
                                                                    {dateStr}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-[10px]">
                                                                            {(shift.users?.display_name || '不').slice(0, 2).toUpperCase()}
                                                                        </div>
                                                                        <span className="font-bold text-gray-800 text-sm">{shift.users?.display_name || '不明'}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <span className="text-sm font-bold text-gray-600 flex items-center gap-1">
                                                                        <Clock size={14} className="text-gray-400" />
                                                                        {shift.start_time.slice(0, 5)} 〜 {shift.end_time.slice(0, 5)}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="flex items-center gap-3">
                                                                        {isFuture ? (
                                                                            <span className="text-[11px] font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                                                                                予定
                                                                            </span>
                                                                        ) : clockIn || wakeUp || leave || clockOut ? (
                                                                            <div className="flex flex-col gap-1.5">
                                                                                <div className="flex items-center gap-2">
                                                                                    {wakeUp ? (
                                                                                        <span className="text-[10px] text-amber-500 font-bold bg-amber-50 px-1.5 py-0.5 rounded flex items-center"><Sun size={10} className="mr-0.5" />起 {new Date(wakeUp.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                                                                                    ) : <span className="text-[10px] text-gray-300">起床未</span>}
                                                                                    {leave ? (
                                                                                        <span className="text-[10px] text-blue-500 font-bold bg-blue-50 px-1.5 py-0.5 rounded flex items-center"><Navigation size={10} className="mr-0.5" />発 {new Date(leave.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                                                                                    ) : <span className="text-[10px] text-gray-300">出発未</span>}
                                                                                </div>
                                                                                <div className="flex items-center gap-2 text-sm">
                                                                                    {clockIn ? (
                                                                                        <span className="font-bold text-emerald-600 flex items-center gap-1">
                                                                                            <UserCheck size={14} />
                                                                                            {new Date(clockIn.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                                                                        </span>
                                                                                    ) : <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded"><UserX size={10} className="inline mr-0.5" />未出勤</span>}
                                                                                    <span className="text-gray-300 mx-1">-</span>
                                                                                    {clockOut ? (
                                                                                        <span className="font-bold text-blue-600">
                                                                                            {new Date(clockOut.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                                                                        </span>
                                                                                    ) : clockIn ? (
                                                                                        <span className="text-[10px] font-bold text-amber-500">勤務中</span>
                                                                                    ) : <span className="text-[10px] text-gray-300">--:--</span>}
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-[11px] font-bold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                                                                                <UserX size={12} /> 打刻なし
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <button
                                                                            onClick={() => {
                                                                                setEditingShift(shift);
                                                                                setIsShiftModalOpen(true);
                                                                            }}
                                                                            className="p-1.5 text-blue-500 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                                                        >
                                                                            <Edit2 size={14} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteShift(shift.id)}
                                                                            className="p-1.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                                                        >
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* シフト作成・編集モーダル */}
            {isShiftModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <CalendarClock className="text-emerald-500" size={20} />
                                {editingShift?.id ? 'シフトを編集' : '新規シフトを作成'}
                            </h2>
                            <button
                                onClick={() => {
                                    setIsShiftModalOpen(false);
                                    setEditingShift(null);
                                    setShiftFormError('');
                                }}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6">
                            {shiftFormError && (
                                <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                                    {shiftFormError}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1"><UserIcon size={14} /> スタッフ</label>
                                    <select
                                        value={editingShift?.user_id || ''}
                                        onChange={e => setEditingShift({ ...editingShift, user_id: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                    >
                                        <option value="">選択してください</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.display_name} ({u.role})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1"><MapPin size={14} /> 勤務店舗 (Location)</label>
                                    <select
                                        value={editingShift?.location || ''}
                                        onChange={e => setEditingShift({ ...editingShift, location: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                                    >
                                        <option value="">店舗を選択してください</option>
                                        {stores.map(s => (
                                            <option key={s.id} value={s.name}>{s.name}</option>
                                        ))}
                                        <option value="店舗未定">店舗未定</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1"><CalendarIcon size={14} /> 勤務日</label>
                                    <input
                                        type="date"
                                        value={editingShift?.date || ''}
                                        onChange={e => setEditingShift({ ...editingShift, date: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1"><Clock size={14} /> 開始時間</label>
                                        <input
                                            type="time"
                                            value={editingShift?.start_time || ''}
                                            onChange={e => setEditingShift({ ...editingShift, start_time: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1"><Clock size={14} /> 終了時間</label>
                                        <input
                                            type="time"
                                            value={editingShift?.end_time || ''}
                                            onChange={e => setEditingShift({ ...editingShift, end_time: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    onClick={() => { setIsShiftModalOpen(false); setEditingShift(null); }}
                                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    キャンセル
                                </button>
                                <button
                                    onClick={handleSaveShift}
                                    className="px-4 py-2 text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors shadow-sm"
                                >
                                    保存する
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 店舗管理モーダル */}
            {isStoreModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Building2 className="text-emerald-500" size={20} />
                                店舗マスター管理
                            </h2>
                            <button
                                onClick={() => {
                                    setIsStoreModalOpen(false);
                                    setEditingStore(null);
                                    setStoreFormError('');
                                }}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="mb-6 flex justify-end">
                                <button
                                    onClick={() => {
                                        setEditingStore({ name: '', latitude: null, longitude: null, radius_m: null, affiliated_staff: [] });
                                        setStoreFormError('');
                                    }}
                                    className="flex items-center gap-2 bg-emerald-500 text-white px-3 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-emerald-600 transition-colors"
                                >
                                    <Plus size={16} /> 店舗を追加
                                </button>
                            </div>

                            {/* 編集・新規フォーム */}
                            {editingStore && (
                                <div className="mb-8 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                                    <h3 className="font-bold text-emerald-800 mb-4">{editingStore.id ? '店舗を編集' : '新規店舗を登録'}</h3>

                                    {storeFormError && (
                                        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                                            {storeFormError}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-gray-600 mb-1">店舗名 (必須)</label>
                                            <input
                                                type="text"
                                                value={editingStore.name || ''}
                                                onChange={(e) => setEditingStore({ ...editingStore, name: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                                placeholder="例: 大阪本店"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-1">緯度 (Latitude) <span className="text-gray-400 font-normal">※任意</span></label>
                                            <input
                                                type="number" step="0.0000001"
                                                value={editingStore.latitude === null || editingStore.latitude === undefined ? '' : editingStore.latitude}
                                                onChange={(e) => setEditingStore({ ...editingStore, latitude: e.target.value === '' ? null : parseFloat(e.target.value) })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-1">経度 (Longitude) <span className="text-gray-400 font-normal">※任意</span></label>
                                            <input
                                                type="number" step="0.0000001"
                                                value={editingStore.longitude === null || editingStore.longitude === undefined ? '' : editingStore.longitude}
                                                onChange={(e) => setEditingStore({ ...editingStore, longitude: e.target.value === '' ? null : parseFloat(e.target.value) })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 mb-1">許容打刻範囲(m) <span className="text-gray-400 font-normal">※任意</span></label>
                                            <input
                                                type="number"
                                                value={editingStore.radius_m === null || editingStore.radius_m === undefined ? '' : editingStore.radius_m}
                                                onChange={(e) => setEditingStore({ ...editingStore, radius_m: e.target.value === '' ? null : parseInt(e.target.value) })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                            />
                                            <p className="text-[10px] text-gray-500 mt-1">この店舗での出退勤打刻を許可する、中心座標からの半径を設定します。</p>
                                        </div>

                                        <div className="md:col-span-2 mt-2">
                                            <label className="block text-xs font-bold text-gray-600 mb-2">所属スタッフ (デバッグ: {users.length}名) <span className="text-gray-400 font-normal">※シフト作成時に上位表示されます</span></label>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-white p-3 border border-gray-200 rounded-lg">
                                                {users.map(u => {
                                                    const isAffiliated = editingStore.affiliated_staff?.includes(u.id);
                                                    return (
                                                        <label key={u.id} className={`flex items-center gap-2 text-sm p-1.5 rounded-md cursor-pointer transition-colors ${isAffiliated ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}>
                                                            <input
                                                                type="checkbox"
                                                                checked={isAffiliated || false}
                                                                onChange={(e) => {
                                                                    const curr = editingStore.affiliated_staff || [];
                                                                    const next = e.target.checked
                                                                        ? [...curr, u.id]
                                                                        : curr.filter(id => id !== u.id);
                                                                    setEditingStore({ ...editingStore, affiliated_staff: next });
                                                                }}
                                                                className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                                                            />
                                                            <span className={`font-bold ${isAffiliated ? 'text-emerald-800' : 'text-gray-700'}`}>{u.display_name}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 mt-4">
                                        <button
                                            onClick={() => { setEditingStore(null); setStoreFormError(''); }}
                                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            キャンセル
                                        </button>
                                        <button
                                            onClick={handleSaveStore}
                                            className="px-4 py-2 text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors shadow-sm"
                                        >
                                            保存する
                                        </button>
                                    </div>
                                </div>
                            )}

                            {stores.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 text-sm border border-gray-100 rounded-xl">
                                    店舗が登録されていません
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                    <thead>
                                        <tr className="bg-gray-100 text-gray-600 text-[11px] uppercase tracking-wider">
                                            <th className="px-4 py-3 font-semibold">店舗名</th>
                                            <th className="px-4 py-3 font-semibold">位置情報</th>
                                            <th className="px-4 py-3 font-semibold text-right w-24">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {stores.map(store => (
                                            <tr key={store.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 font-bold text-gray-800 text-sm">{store.name}</td>
                                                <td className="px-4 py-3">
                                                    {(store.latitude !== null && store.longitude !== null) ? (
                                                        <>
                                                            <div className="text-[11px] text-gray-500 font-mono">
                                                                Lat: {store.latitude}<br />
                                                                Lng: {store.longitude}
                                                            </div>
                                                            <div className="text-[10px] text-emerald-600 font-bold mt-0.5">
                                                                半径 {store.radius_m || 500}m
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 font-bold">未設定</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => setEditingStore(store)}
                                                            className="p-1.5 text-blue-500 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteStore(store.id, store.name)}
                                                            className="p-1.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* カスタム確認モーダル */}
            {pendingConfirm && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
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
        </div>
    );
}
