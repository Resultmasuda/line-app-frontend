"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CalendarClock, Search, Filter, ChevronLeft, ChevronRight, Clock, MapPin, UserCheck, UserX, Sun, Navigation, Building2, Plus, Edit2, Trash2, X, Calendar as CalendarIcon, User as UserIcon, Copy, Check, Bookmark } from 'lucide-react';
import { getAllShifts, getAllAttendances, getAllStores, createStore, updateStore, deleteStore, createShift, updateShift, deleteShift, StoreRecord, getAllUsers, AdminUserRecord, getUserPermissions } from '@/lib/api/admin';
import { useLiff } from '@/components/LiffProvider';
import { supabase } from '@/lib/supabase';
import { buildInviteStoreLink, getInviteTtlMinutes } from '@/lib/invite';
type ShiftRecord = {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    location: string;
    users?: { display_name: string };
    user_id: string;
    shift_type?: string;
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
    const [userPermissions, setUserPermissions] = useState<any[]>([]);
    const { user: liffUser, loading: liffLoading } = useLiff();
    const [currentUser, setCurrentUser] = useState<any>(null);

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
    const [storeTypeFilter, setStoreTypeFilter] = useState<'store' | 'role_group'>('store');

    // カスタム確認モーダル用
    const [pendingConfirm, setPendingConfirm] = useState<{ message: string, action: () => void } | null>(null);

    // 招待リンク生成＆コピー用
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const handleCopyInviteLink = (storeId: string) => {
        const baseUrl = window.location.origin;
        const inviteUrl = buildInviteStoreLink(baseUrl, storeId);

        navigator.clipboard.writeText(inviteUrl).then(() => {
            setCopiedId(storeId);
            setTimeout(() => setCopiedId(null), 2000);
            alert(`招待リンクをコピーしました（有効期限: ${getInviteTtlMinutes()}分）`);
        }).catch(err => {
            console.error('Failed to copy:', err);
            alert('コピーに失敗しました');
        });
    };

    useEffect(() => {
        if (!liffUser) return;
        
        async function fetchData() {
            setIsLoading(true);
            const ym = currentDate.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit' }).replace(/\//g, '-');

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

            // LIFFユーザーの情報と権限を取得
            if (liffUser) {
                setCurrentUser(liffUser);
                const permRes = await getUserPermissions(liffUser.id);
                if (permRes.success && permRes.data) {
                    setUserPermissions(permRes.data);
                }
            }

            setIsLoading(false);
        }
        fetchData();

        // リアルタイム更新の購読
        const channel = supabase
            .channel('shift_changes')
            .on('postgres_changes', { event: '*', table: 'shifts', schema: 'public' }, () => {
                fetchData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentDate, liffUser]);

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    // 東京時間（JST）の現在日付文字列を取得するヘルパー
    const getJSTDateStr = (date: Date) => {
        return new Intl.DateTimeFormat('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            timeZone: 'Asia/Tokyo'
        }).format(date).replace(/\//g, '-');
    };

    const now = new Date();
    const todayStr = getJSTDateStr(now);
    const tomorrowStr = getJSTDateStr(new Date(now.getTime() + 24 * 60 * 60 * 1000));

    const filteredShifts = shifts.filter(s => {
        const matchesSearch = (s.users?.display_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.location || '').toLowerCase().includes(searchQuery.toLowerCase());
        const targetDate = activeTab === 'today' ? todayStr : tomorrowStr;
        return matchesSearch && s.date === targetDate;
    }).sort((a, b) => new Date(`${a.date}T${a.start_time}`).getTime() - new Date(`${b.date}T${b.start_time}`).getTime());

    // storeTypeFilter に合致する店舗だけを対象にする
    const filteredStores = stores.filter(s => {
        const matchesType = (s.type || 'store') === storeTypeFilter;
        if (!matchesType) return false;

        // 特権管理者の場合は全て表示
        const SUPER_IDS = ['c42cb255-d3ad-41cb-9b48-e6ffcd2f6648', '87e75b91-210c-41bb-9cc3-cc7850d473d4'];
        if (currentUser && (SUPER_IDS.includes(currentUser.id) || currentUser.role === 'PRESIDENT' || currentUser.role === 'EXECUTIVE')) {
            return true;
        }

        // それ以外（MANAGERロール等）は MANAGE_STORE 権限がある店舗のみ表示
        return userPermissions.some(p => p.permission === 'MANAGE_STORE' && p.location_id === s.id);
    });

    // 全ての店舗名を配列のキーとして初期化（シフトが0件でも表示するため）
    const groupedShifts = filteredStores.reduce((acc, store) => {
        acc[store.name] = [];
        return acc;
    }, {} as Record<string, ShiftRecord[]>);

    // 実際のシフトを割り当て
    filteredShifts.forEach(shift => {
        const loc = shift.location || '店舗未定';
        // 該当店舗、または物理店舗表示時の未定シフトのみ割り当てる
        if (groupedShifts[loc] !== undefined || (storeTypeFilter === 'store' && loc === '店舗未定')) {
            if (!groupedShifts[loc]) groupedShifts[loc] = [];
            groupedShifts[loc].push(shift);
        }
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
            type: editingStore.type || 'store',
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
            location: editingShift.location,
            shift_type: editingShift.shift_type || 'work'
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center max-w-6xl gap-4">
                <div className="flex-shrink-0">
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3 tracking-tighter">
                        <div className="p-2 bg-brand-blue/10 text-brand-blue rounded-2xl shadow-inner">
                            <CalendarClock size={28} strokeWidth={2.5} />
                        </div>
                        シフト・勤怠管理
                    </h1>
                    <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-widest flex items-center gap-2">
                        <Bookmark size={14} className="text-brand-gold" /> 勤怠・スケジュールの管理
                    </p>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3 w-full md:w-auto mt-2 md:mt-0">
                    <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 flex-1 md:flex-none shadow-inner">
                        <button
                            onClick={() => setStoreTypeFilter('store')}
                            className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${storeTypeFilter === 'store' ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20 scale-105' : 'text-slate-500 hover:text-brand-blue'}`}
                        >
                            シフト
                        </button>
                        <button
                            onClick={() => setStoreTypeFilter('role_group')}
                            className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${storeTypeFilter === 'role_group' ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20 scale-105' : 'text-slate-500 hover:text-brand-blue'}`}
                        >
                            予定
                        </button>
                    </div>
                    <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl shadow-inner border border-slate-200 flex-1 md:flex-none overflow-x-auto hide-scrollbar">
                        <button
                            onClick={() => setActiveTab('today')}
                            className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'today' ? 'bg-white text-brand-blue shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            本日 ({todayStr.slice(5).replace('-', '/')})
                        </button>
                        <button
                            onClick={() => setActiveTab('tomorrow')}
                            className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'tomorrow' ? 'bg-white text-brand-blue shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            明日 ({tomorrowStr.slice(5).replace('-', '/')})
                        </button>
                        <div className="w-px h-5 bg-gray-300 mx-1 hidden sm:block"></div>
                        <Link
                            href="/admin/shifts/calendar"
                            className="flex-1 md:flex-none px-3 py-1.5 rounded-lg text-sm font-bold transition-all text-gray-500 hover:text-emerald-600 hover:bg-white shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap"
                            title="全社員の月間シフトを一覧表示"
                        >
                            <CalendarIcon size={14} />
                            <span className="hidden sm:inline">月間ビュー</span>
                            <span className="sm:hidden">月間</span>
                        </Link>
                    </div>
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
                                const todayStrJST = new Intl.DateTimeFormat('ja-JP', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    timeZone: 'Asia/Tokyo'
                                }).format(new Date()).replace(/\//g, '-');
                                setEditingShift({ date: todayStrJST, start_time: '10:00', end_time: '19:00', location: '' });
                                setIsShiftModalOpen(true);
                            }}
                            className="flex-1 md:flex-none justify-center flex items-center gap-2 px-5 py-2.5 bg-brand-blue text-white rounded-xl text-xs font-black tracking-widest uppercase shadow-lg shadow-brand-blue/20 hover:bg-brand-deep-blue transition-all active:scale-95"
                        >
                            <Plus size={16} strokeWidth={3} />
                            シフト作成
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
                                    <div key={store} className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden group/store transition-all hover:shadow-xl hover:shadow-slate-200/50">
                                        <div className="bg-slate-50/50 px-6 py-5 flex items-center gap-4 border-b border-slate-100 flex-wrap sm:flex-nowrap">
                                            <div className="flex items-center gap-4 flex-wrap flex-1">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-brand-blue/10 text-brand-blue rounded-xl shadow-inner">
                                                        <MapPin size={20} strokeWidth={2.5} />
                                                    </div>
                                                    <Link href={`/admin/shifts/${storeId}`} className="group/link flex items-center gap-2 hover:opacity-80 transition-opacity">
                                                        <h2 className="font-black text-slate-800 text-lg tracking-tight group-hover/link:text-brand-blue">{store}</h2>
                                                        <ChevronRight size={18} className="text-slate-300 group-hover/link:text-brand-blue transition-all" />
                                                    </Link>
                                                </div>
                                                <span className="text-[10px] font-black text-brand-blue bg-white border border-brand-blue/10 px-3 py-1 rounded-full shadow-sm uppercase tracking-widest whitespace-nowrap">
                                                    {groupedShifts[store].length} 件の予定
                                                </span>
                                            </div>

                                            {/* シフトビルダーへの導線ボタン */}
                                            {storeObj && (
                                                <div className="w-full sm:w-auto flex items-center gap-2 mt-2 sm:mt-0 justify-end sm:justify-start">
                                                    <button
                                                        onClick={() => handleCopyInviteLink(storeId)}
                                                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg shadow-sm border transition-all whitespace-nowrap ${copiedId === storeId
                                                            ? 'bg-emerald-500 text-white border-emerald-500'
                                                            : 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                                                            }`}
                                                        title="スタッフをこの店舗に招待するリンクをコピー"
                                                    >
                                                        {copiedId === storeId ? <Check size={14} /> : <Copy size={14} />}
                                                        {copiedId === storeId ? '招待用URL' : '招待用URL'}
                                                    </button>
                                                    <Link
                                                        href={`/admin/shifts/${storeId}/builder`}
                                                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg shadow-sm hover:bg-indigo-700 transition-colors whitespace-nowrap"
                                                    >
                                                        <CalendarIcon size={16} />
                                                        シフトビルダーを開く
                                                    </Link>
                                                </div>
                                            )}
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse min-w-[700px]">
                                                <thead>
                                                    <tr className="bg-slate-50/30 text-slate-400 text-[10px] uppercase tracking-widest">
                                                        <th className="px-8 py-4 font-black border-b border-slate-50 whitespace-nowrap">日付</th>
                                                        <th className="px-8 py-4 font-black border-b border-slate-50 whitespace-nowrap">スタッフ</th>
                                                        <th className="px-8 py-4 font-black border-b border-slate-50 whitespace-nowrap">時間</th>
                                                        <th className="px-8 py-4 font-black border-b border-slate-50 whitespace-nowrap">稼働状況</th>
                                                        <th className="px-8 py-4 font-black border-b border-slate-50 text-right whitespace-nowrap">操作</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 bg-white">
                                                    {groupedShifts[store].length === 0 ? (
                                                        <tr>
                                                            <td colSpan={5} className="px-6 py-8 text-center text-gray-500 bg-gray-50/50">
                                                                <p className="text-sm font-bold">{activeTab === 'today' ? '本日' : '明日'}のシフトはありません</p>
                                                                <p className="text-xs mt-1 text-gray-400">※ 他の日付のシフトを確認するには、店舗名をクリックして月間シフト一覧を開いてください。</p>
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        groupedShifts[store].map((shift) => {
                                                            const dateStr = new Date(shift.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' });
                                                            const atts = getShiftAttendances(shift.user_id, shift.date);

                                                            const clockIn = atts.find(a => a.type === 'CLOCK_IN');
                                                            const clockOut = atts.find(a => a.type === 'CLOCK_OUT');
                                                            const wakeUp = atts.find(a => a.type === 'WAKE_UP');
                                                            const leave = atts.find(a => a.type === 'LEAVE');
                                                            const isFuture = new Date(shift.date) > new Date();

                                                            return (
                                                                <tr key={shift.id} className="group hover:bg-gray-50 transition-colors">
                                                                    <td className="px-8 py-5 text-sm font-black text-slate-700 whitespace-nowrap">
                                                                        <span className="text-slate-300 font-normal mr-1">{dateStr.split('(')[0]}</span>
                                                                        <span className="text-brand-blue">({dateStr.split('(')[1]}</span>
                                                                    </td>
                                                                    <td className="px-8 py-5 whitespace-nowrap">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-10 h-10 rounded-xl bg-brand-blue/5 text-brand-blue flex items-center justify-center font-black text-xs border border-brand-blue/10 shadow-inner">
                                                                                {(shift.users?.display_name || '不').slice(0, 1).toUpperCase()}
                                                                            </div>
                                                                            <span className="font-black text-slate-700 text-sm">{shift.users?.display_name || '不明'}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                                        <span className="text-sm font-bold text-gray-600 flex items-center gap-1">
                                                                            <Clock size={14} className="text-gray-400" />
                                                                            {shift.start_time.slice(0, 5)} 〜 {shift.end_time.slice(0, 5)}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-8 py-5 whitespace-nowrap">
                                                                        <div className="flex items-center gap-3">
                                                                            {isFuture ? (
                                                                                <span className="text-[10px] font-black text-slate-400 bg-slate-50 border border-slate-100 px-3 py-1 rounded-full uppercase tracking-widest">
                                                                                    予定
                                                                                </span>
                                                                            ) : clockIn || wakeUp || leave || clockOut ? (
                                                                                <div className="flex flex-col gap-2">
                                                                                    <div className="flex items-center gap-2">
                                                                                        {wakeUp ? (
                                                                                            <span className="text-[9px] text-purple-600 font-black bg-purple-50 border border-purple-100 px-2.5 py-1 rounded-lg flex items-center uppercase tracking-tighter"><Sun size={12} strokeWidth={3} className="mr-0.5" /> 起床 {new Date(wakeUp.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                                                                                        ) : <span className="text-[9px] text-slate-200 font-black uppercase tracking-tighter">起床記録なし</span>}
                                                                                        {leave ? (
                                                                                            <span className="text-[9px] text-cyan-600 font-black bg-cyan-50 border border-cyan-100 px-2.5 py-1 rounded-lg flex items-center uppercase tracking-tighter"><Navigation size={12} strokeWidth={3} className="mr-0.5" /> 出発 {new Date(leave.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                                                                                        ) : <span className="text-[9px] text-slate-200 font-black uppercase tracking-tighter">出発記録なし</span>}
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2">
                                                                                        {clockIn ? (
                                                                                            <span className="font-black text-emerald-600 text-sm flex items-center gap-1">
                                                                                                <UserCheck size={16} strokeWidth={3} />
                                                                                                {new Date(clockIn.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                                                                            </span>
                                                                                        ) : <span className="text-[10px] font-black text-rose-500 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-lg flex items-center gap-1 uppercase tracking-tighter"><UserX size={12} strokeWidth={3} /> 未打刻</span>}
                                                                                        <span className="text-slate-200 px-1">/</span>
                                                                                        {clockOut ? (
                                                                                            <span className="font-black text-brand-blue text-sm">
                                                                                                {new Date(clockOut.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                                                                            </span>
                                                                                        ) : clockIn ? (
                                                                                            <span className="text-[10px] font-black text-brand-gold bg-brand-gold/10 px-2 py-0.5 rounded-lg uppercase tracking-widest">稼働中</span>
                                                                                        ) : <span className="text-slate-200">--:--</span>}
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <span className="text-[10px] font-black text-rose-500 bg-rose-50 border border-rose-100 px-3 py-1 rounded-full flex items-center gap-1.5 uppercase tracking-widest">
                                                                                    <UserX size={14} strokeWidth={3} /> 記録なし
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-8 py-5 whitespace-nowrap">
                                                                        <div className="flex justify-end gap-3 transition-opacity">
                                                                            <button
                                                                                onClick={() => {
                                                                                    setEditingShift(shift);
                                                                                    setIsShiftModalOpen(true);
                                                                                }}
                                                                                className="p-2.5 text-slate-400 bg-slate-50 hover:bg-white hover:text-brand-blue hover:shadow-lg rounded-2xl transition-all border border-slate-100 active:scale-90"
                                                                                title="編集"
                                                                            >
                                                                                <Edit2 size={16} strokeWidth={2.5} />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDeleteShift(shift.id)}
                                                                                className="p-2.5 text-slate-400 bg-slate-50 hover:bg-rose-50 hover:text-rose-500 hover:shadow-lg rounded-2xl transition-all border border-slate-100 active:scale-90"
                                                                                title="削除"
                                                                            >
                                                                                <Trash2 size={16} strokeWidth={2.5} />
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
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
                                    <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1"><MapPin size={14} /> 勤務店舗 / グループ</label>
                                    <select
                                        value={editingShift?.location || ''}
                                        onChange={e => setEditingShift({ ...editingShift, location: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                                    >
                                        <option value="">店舗を選択してください</option>
                                        {stores.map(s => (
                                            <option key={s.id} value={s.name}>{s.name}</option>
                                        ))}
                                        <option value="店舗未定">未定</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1"><CalendarClock size={14} /> シフト種別</label>
                                    <select
                                        value={editingShift?.shift_type || 'work'}
                                        onChange={e => setEditingShift({ ...editingShift, shift_type: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                                    >
                                        <option value="work">通常出勤 (Work)</option>
                                        <option value="task">業務/タスク (Task)</option>
                                        <option value="interview">面談/ミーティング (Interview)</option>
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
                                        setEditingStore({ name: '', type: 'store', latitude: null, longitude: null, radius_m: null, affiliated_staff: [] });
                                        setStoreFormError('');
                                    }}
                                    className="flex items-center gap-2 bg-emerald-500 text-white px-3 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-emerald-600 transition-colors"
                                >
                                    <Plus size={16} /> 店舗/グループを追加
                                </button>
                            </div>

                            {/* 編集・新規フォーム */}
                            {editingStore && (
                                <div className="mb-8 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                                    <h3 className="font-bold text-emerald-800 mb-4">{editingStore.id ? '設定を編集' : '新規登録'}</h3>

                                    {storeFormError && (
                                        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                                            {storeFormError}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-1">
                                            <label className="block text-xs font-bold text-gray-600 mb-1">店舗名/グループ名 (必須)</label>
                                            <input
                                                type="text"
                                                value={editingStore.name || ''}
                                                onChange={(e) => setEditingStore({ ...editingStore, name: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                                placeholder="例: 大阪本店 / 全体MTG"
                                            />
                                        </div>
                                        <div className="md:col-span-1">
                                            <label className="block text-xs font-bold text-gray-600 mb-1">グループ種別</label>
                                            <select
                                                value={editingStore.type || 'store'}
                                                onChange={(e) => setEditingStore({ ...editingStore, type: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                                            >
                                                <option value="store">シフト (打刻範囲あり)</option>
                                                <option value="role_group">予定 (打刻範囲なし)</option>
                                            </select>
                                        </div>
                                        {editingStore.type !== 'role_group' && (
                                            <>
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
                                            </>
                                        )}

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
                                    店舗・グループが登録されていません
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                                    <table className="w-full text-left border-collapse min-w-[500px]">
                                        <thead>
                                            <tr className="bg-gray-100 text-gray-600 text-[11px] uppercase tracking-wider">
                                                <th className="px-4 py-3 font-semibold">名称</th>
                                                <th className="px-4 py-3 font-semibold">種別</th>
                                                <th className="px-4 py-3 font-semibold">位置情報</th>
                                                <th className="px-4 py-3 font-semibold text-right w-24">操作</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 bg-white">
                                            {stores.map(store => (
                                                <tr key={store.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3 font-bold text-gray-800 text-sm">{store.name}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${store.type === 'role_group' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                            {store.type === 'role_group' ? '役職・タスク' : '物理店舗'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {(store.latitude !== null && store.longitude !== null && store.type !== 'role_group') ? (
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
                                                            <span className="text-xs text-gray-400 font-bold">-</span>
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
                                </div>
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
