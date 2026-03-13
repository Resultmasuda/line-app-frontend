"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, CalendarClock, Receipt, MapPin, Play, Square, UserCheck, UserX, Sun, Navigation, Edit2, Unlink, KeyRound, User, Trash2 } from 'lucide-react';
import { getUserProfile, AdminUserRecord, updateUserRole, updateUserPhoneNumber, unlinkUserLineId, updateUserPinCode, updateUserDisplayName, deleteUser, getAllStores, StoreRecord, updateStore, getUserPermissions, toggleUserPermission, UserPermission } from '@/lib/api/admin';
import { getMonthlyShifts, ShiftRecord } from '@/lib/api/shift';
import { getMonthlyAttendances, AttendanceRecord } from '@/lib/api/attendance';
import { getMonthlyExpenses, ExpenseRecord } from '@/lib/api/expense';
import { useLiff } from '@/components/LiffProvider';
import { getRoleDisplayLabel, getRoleBadgeClass, ROLE_OPTIONS } from '@/lib/utils/auth';

export default function StaffDetailView() {
    const { user: currentUser } = useLiff();
    const params = useParams();
    const router = useRouter();
    const userId = params.id as string;
    const isSuperAdmin = ['c42cb255-d3ad-41cb-9b48-e6ffcd2f6648', '87e75b91-210c-41bb-9cc3-cc7850d473d4'].includes(userId);

    const [user, setUser] = useState<AdminUserRecord | null>(null);
    const [shifts, setShifts] = useState<ShiftRecord[]>([]);
    const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
    const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
    const [stores, setStores] = useState<StoreRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdatingRole, setIsUpdatingRole] = useState(false);
    const [isUpdatingStore, setIsUpdatingStore] = useState(false);
    const [permissions, setPermissions] = useState<UserPermission[]>([]);
    const [isUpdatingPermission, setIsUpdatingPermission] = useState(false);

    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        async function fetchAllData() {
            if (!userId) return;
            setIsLoading(true);

            // 並列でユーザー情報、シフト、打刻、交通費、店舗一覧を取得
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const ym = `${year}-${month}`;

            const [userRes, shiftRes, attRes, expRes, storeRes, permRes] = await Promise.all([
                getUserProfile(userId),
                getMonthlyShifts(userId, ym),
                getMonthlyAttendances(userId, ym),
                getMonthlyExpenses(userId, ym),
                getAllStores(),
                getUserPermissions(userId)
            ]);

            if (userRes.success && userRes.data) setUser(userRes.data);
            if (shiftRes.success && shiftRes.data) setShifts(shiftRes.data);
            if (attRes.success && attRes.data) setAttendances(attRes.data);
            if (expRes.success && expRes.data) setExpenses(expRes.data);
            if (storeRes.success && storeRes.data) setStores(storeRes.data);
            if (permRes.success && permRes.data) setPermissions(permRes.data);

            setIsLoading(false);
        }

        fetchAllData();
    }, [userId, currentDate]);

    const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const handleRoleChange = async (newRole: string) => {
        if (!userId || !currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'MANAGER')) return;
        if (!confirm(`ユーザーの権限を ${newRole} に変更しますか？`)) return;

        setIsUpdatingRole(true);
        try {
            await updateUserRole(userId, newRole);
            setUser(prev => prev ? { ...prev, role: newRole } : null);
            alert('権限を更新しました。');
        } catch (error) {
            console.error('Failed to update role:', error);
            alert('権限の更新に失敗しました。');
        } finally {
            setIsUpdatingRole(false);
        }
    };

    const handleEditName = async () => {
        if (!userId || !currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'MANAGER') || !user) return;
        const newName = prompt('新しい氏名を入力してください:', user.display_name);
        if (newName === null || newName.trim() === '' || newName === user.display_name) return;

        try {
            const res = await updateUserDisplayName(userId, newName.trim());
            if (res.success) {
                setUser(prev => prev ? { ...prev, display_name: newName.trim() } : null);
                alert('氏名を更新しました。');
            } else {
                alert('氏名の更新に失敗しました。');
            }
        } catch (error) {
            console.error('Failed to update name:', error);
            alert('エラーが発生しました。');
        }
    };

    const handleEditPhone = async () => {
        if (!userId || !currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'MANAGER') || !user) return;
        const currentPhone = user.phone_number || '';
        const newPhone = prompt('新しい電話番号を入力してください（ハイフンなし）:', currentPhone);

        if (newPhone === null || newPhone === currentPhone) return;

        const cleanedPhone = newPhone.replace(/[^0-9]/g, '');
        if (!cleanedPhone) {
            alert('有効な電話番号を入力してください。');
            return;
        }

        try {
            const res = await updateUserPhoneNumber(userId, cleanedPhone);
            if (res.success) {
                setUser(prev => prev ? { ...prev, phone_number: cleanedPhone } : null);
                alert('電話番号を更新しました。');
            } else {
                alert('電話番号の更新に失敗しました。他のスタッフが既に使用している可能性があります。');
            }
        } catch (error) {
            console.error('Failed to update phone:', error);
            alert('エラーが発生しました。');
        }
    };

    const handleUnlinkLineId = async () => {
        if (!userId || !currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'MANAGER') || !user?.line_user_id) return;
        if (!confirm('このスタッフのLINE連携を解除しますか？\n（解除後、スタッフは再度LINEログインと認証が必要になります）')) return;

        try {
            const res = await unlinkUserLineId(userId);
            if (res.success) {
                setUser(prev => prev ? { ...prev, line_user_id: null } : null);
                alert('LINE連携を解除しました。');
            } else {
                alert('連携解除に失敗しました。');
            }
        } catch (error) {
            console.error('Failed to unlink LINE ID:', error);
            alert('エラーが発生しました。');
        }
    };

    const handleEditPin = async () => {
        if (!userId || !currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'MANAGER') || !user) return;
        const currentPin = user.pin_code || '';
        const newPin = prompt('新しいパスワードを入力してください。\n（空欄にすると全体共通パスワードが適用されます）:', currentPin);

        if (newPin === null || newPin === currentPin) return; // キャンセル、または変更なし

        const cleanedPin = newPin.trim();

        try {
            const res = await updateUserPinCode(userId, cleanedPin === '' ? null : cleanedPin);
            if (res.success) {
                setUser(prev => prev ? { ...prev, pin_code: cleanedPin === '' ? null : cleanedPin } : null);
                alert(cleanedPin === '' ? '個別のパスワード設定を解除し、全体共通パスワードに戻しました。' : 'パスワードを個別に更新しました。');
            } else {
                alert('パスワードの更新に失敗しました。');
            }
        } catch (error) {
            console.error('Failed to update pin code:', error);
            alert('エラーが発生しました。');
        }
    };

    const handleDeleteStaff = async () => {
        if (!userId || !currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'MANAGER')) return;
        if (!confirm(`スタッフ「${user?.display_name}」を完全に削除しますか？\nこの操作は取り消せません。`)) return;

        try {
            const res = await deleteUser(userId);
            if (res.success) {
                alert('スタッフを削除しました。');
                router.push('/admin/staff');
            } else {
                alert('削除に失敗しました。');
            }
        } catch (error) {
            console.error('Failed to delete user:', error);
            alert('エラーが発生しました。');
        }
    };

    const toggleStoreAffiliation = async (storeId: string) => {
        if (!user || (!isAdminUser(currentUser) && currentUser?.role !== 'MANAGER')) return;

        setIsUpdatingStore(true);
        try {
            const targetStore = stores.find(s => s.id === storeId);
            if (!targetStore) throw new Error('Store not found');

            let currentStaffList: string[] = [];
            if (targetStore.affiliated_staff) {
                if (typeof targetStore.affiliated_staff === 'string') {
                    currentStaffList = JSON.parse(targetStore.affiliated_staff);
                } else if (Array.isArray(targetStore.affiliated_staff)) {
                    currentStaffList = targetStore.affiliated_staff;
                }
            }

            const staffId = user.id;
            const isAffiliated = currentStaffList.includes(staffId);

            const newStaffList = isAffiliated
                ? currentStaffList.filter(id => id !== staffId)
                : [...currentStaffList, staffId];

            const res = await updateStore(storeId, { affiliated_staff: newStaffList });
            if (res.success && res.data) {
                // Update local state
                setStores(stores.map(s => s.id === storeId ? res.data : s));
            } else {
                throw new Error('Failed to update store');
            }
        } catch (error) {
            console.error('Failed to update store affiliation:', error);
            alert('担当販路の更新に失敗しました。');
        } finally {
            setIsUpdatingStore(false);
        }
    };

    const handlePermissionToggle = async (permission: string, locationId: string | null = null) => {
        if (!userId || !currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'MANAGER')) return;
        
        const isEnabled = permissions.some(p => p.permission === permission && p.location_id === locationId);
        setIsUpdatingPermission(true);
        try {
            const res = await toggleUserPermission(userId, permission, locationId, !isEnabled);
            if (res.success) {
                if (!isEnabled) {
                    setPermissions([...permissions, { user_id: userId, permission, location_id: locationId, is_master: false }]);
                } else {
                    setPermissions(permissions.filter(p => !(p.permission === permission && p.location_id === locationId)));
                }
            } else {
                alert('権限の更新に失敗しました。');
            }
        } catch (error) {
            console.error('Failed to toggle permission:', error);
        } finally {
            setIsUpdatingPermission(false);
        }
    };

    const hasPermission = (permission: string, locationId: string | null = null) => {
        return permissions.some(p => p.permission === permission && p.location_id === locationId);
    };


    const getShiftAttendances = (date: string) => attendances.filter(a => a.date === date);

    const isAdminUser = (user: any) => user?.role === 'ADMIN' || user?.role === 'MANAGER'; // Utility fn if missing

    if (isLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="text-center py-20 text-gray-500">
                ユーザー情報が見つかりませんでした。<br />
                <button onClick={() => router.back()} className="text-emerald-500 underline mt-4">戻る</button>
            </div>
        );
    }

    const currentMonthStr = `${currentDate.getFullYear()}年 ${currentDate.getMonth() + 1}月`;
    const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

    return (
        <div className="space-y-6 max-w-5xl">
            {/* ヘッダーセクション */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="flex items-start gap-4 flex-1">
                        <button
                            onClick={() => router.push('/admin/staff')}
                            className="p-2 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-all shadow-sm active:scale-95 flex-shrink-0 mt-1"
                        >
                            <ChevronLeft size={20} className="text-gray-500" />
                        </button>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight">
                                    {user.display_name}
                                </h1>
                                {(currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER') && (
                                    <button onClick={handleEditName} className="text-gray-400 hover:text-emerald-500 transition-colors p-1" title="氏名を編集">
                                        <Edit2 size={18} />
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-2 mt-3 flex-wrap">
                                {currentUser?.role === 'ADMIN' ? (
                                    <select
                                        value={user.role.toUpperCase()}
                                        disabled={isUpdatingRole}
                                        onChange={(e) => handleRoleChange(e.target.value)}
                                        className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer outline-none shadow-sm disabled:opacity-75 disabled:cursor-not-allowed ${getRoleBadgeClass(user.role)}`}
                                    >
                                        {ROLE_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <span className={`px-4 py-1 text-xs rounded-full font-bold border shadow-sm ${getRoleBadgeClass(user.role)}`}>
                                        {getRoleDisplayLabel(user.role)}
                                    </span>
                                )}
                                
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 text-gray-500 rounded-full border border-gray-200 text-[10px] font-mono">
                                    System ID: {user.id.slice(0, 8)}...
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2.5 min-w-[240px]">
                        <div className="flex items-center justify-between group px-3 py-2 bg-gray-50/50 rounded-xl border border-gray-100">
                            <span className="text-[10px] font-bold text-gray-400">電話番号:</span>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-gray-700 font-mono tracking-wider">
                                    {user.phone_number ? user.phone_number : '未設定'}
                                </span>
                                {(currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER') && (
                                    <button onClick={handleEditPhone} className="text-gray-400 hover:text-emerald-500 transition-colors p-1" title="電話番号を編集">
                                        <Edit2 size={13} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between group px-3 py-2 bg-gray-50/50 rounded-xl border border-gray-100">
                            <span className="text-[10px] font-bold text-gray-400">LINE連携:</span>
                            <div className="flex items-center gap-2">
                                {user.line_user_id ? (
                                    <>
                                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">連携済み</span>
                                        {(currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER') && (
                                            <button onClick={handleUnlinkLineId} className="text-gray-400 hover:text-rose-500 transition-colors p-1" title="連携を解除">
                                                <Unlink size={13} />
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">未連携</span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between group px-3 py-2 bg-gray-50/50 rounded-xl border border-gray-100">
                            <span className="text-[10px] font-bold text-gray-400">パスワード:</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-gray-600">
                                    {user.pin_code ? '個別設定中' : '全体共通'}
                                </span>
                                {(currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER') && (
                                    <button onClick={handleEditPin} className="text-gray-400 hover:text-emerald-500 transition-colors p-1" title="パスワードを変更">
                                        <KeyRound size={13} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {(currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER') && !isSuperAdmin && (
                            <button
                                onClick={handleDeleteStaff}
                                className="flex items-center justify-center gap-1.5 w-full py-2 mt-1 bg-white text-rose-500 rounded-xl text-xs font-bold hover:bg-rose-50 transition-all border border-rose-100 shadow-sm active:scale-95"
                            >
                                <Trash2 size={14} />
                                スタッフを削除
                            </button>
                        )}
                    </div>
                </div>

                {/* 所属店舗（担当販路）の設定 - ヘッダー内に統合 */}
                {(currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER') && stores.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <MapPin size={14} className="text-orange-500 pb-0.5" />
                            担当販路（所属店舗）の設定
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {stores.map(store => {
                                let isAffiliated = false;
                                try {
                                    const staffList = typeof store.affiliated_staff === 'string'
                                        ? JSON.parse(store.affiliated_staff)
                                        : (store.affiliated_staff || []);
                                    isAffiliated = Array.isArray(staffList) && staffList.includes(user.id);
                                } catch (e) { }

                                return (
                                    <button
                                        key={store.id}
                                        onClick={() => toggleStoreAffiliation(store.id)}
                                        disabled={isUpdatingStore}
                                        className={`relative flex items-center gap-2 pl-2 pr-4 py-2 rounded-xl border transition-all text-xs font-bold overflow-hidden ${isAffiliated
                                            ? 'bg-orange-50 border-orange-200 text-orange-700 shadow-sm'
                                            : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300 hover:bg-gray-50'
                                            } ${isUpdatingStore ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                                    >
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${isAffiliated ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-300'}`}>
                                            {isAffiliated ? <UserCheck size={11} strokeWidth={3} /> : <UserX size={11} strokeWidth={2} />}
                                        </div>
                                        {store.name}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-3 font-medium">
                            ※ ここでONにした店舗が、スタッフ自身のカレンダーリストにショートカット表示されます。
                        </p>
                    </div>
                )}

                {/* 権限詳細設定 */}
                {(currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER') && (
                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <KeyRound size={14} className="text-emerald-500 pb-0.5" />
                            アプリ・管理詳細権限の設定
                        </h3>
                        
                        <div className="space-y-6">
                            {/* モバイルアプリ権限 */}
                            <div>
                                <h4 className="text-[10px] font-bold text-gray-500 mb-2">モバイルアプリ操作</h4>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => handlePermissionToggle('MOBILE_CALENDAR_VIEW')}
                                        disabled={isUpdatingPermission}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-xs font-bold ${hasPermission('MOBILE_CALENDAR_VIEW')
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                            : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
                                        }`}
                                    >
                                        <CalendarClock size={14} />
                                        カレンダー閲覧を許可
                                    </button>
                                </div>
                            </div>

                            {/* 管理画面・販路別権限 */}
                            <div>
                                <h4 className="text-[10px] font-bold text-gray-500 mb-2">管理者用：販路別管理権限 (Manager/Adminロール向け)</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {stores.map(store => (
                                        <div key={store.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                            <span className="text-xs font-bold text-gray-700">{store.name}</span>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handlePermissionToggle('MANAGE_STORE', store.id)}
                                                    disabled={isUpdatingPermission}
                                                    className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all ${hasPermission('MANAGE_STORE', store.id)
                                                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                                                        : 'bg-white border-gray-200 text-gray-400'
                                                    }`}
                                                >
                                                    管理許可
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 当月のサマリーカード */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <button onClick={handlePrevMonth} className="px-3 py-1.5 text-gray-500 bg-gray-50 rounded-lg font-bold hover:bg-gray-100">先月</button>
                    <span className="font-black text-xl text-gray-800 tracking-tight w-32 text-center">{currentMonthStr}</span>
                    <button onClick={handleNextMonth} className="px-3 py-1.5 text-gray-500 bg-gray-50 rounded-lg font-bold hover:bg-gray-100">翌月</button>
                </div>

                <div className="flex gap-8">
                    <div>
                        <p className="text-xs font-bold text-gray-400 mb-1">当月シフト数</p>
                        <p className="text-2xl font-black text-gray-800">{shifts.length} <span className="text-sm text-gray-500 font-bold">日</span></p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 mb-1">当月交通費総額</p>
                        <p className="text-2xl font-black text-emerald-600"><span className="text-sm font-bold mr-1">¥</span>{totalExpense.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 左列：シフトと打刻の突合 */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[600px]">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                        <CalendarClock size={18} className="text-indigo-500" />
                        <h2 className="font-bold text-gray-700">シフト・出退勤ログ ({shifts.length}件)</h2>
                    </div>
                    <div className="p-4 overflow-y-auto flex-1 space-y-4">
                        {shifts.length === 0 ? (
                            <p className="text-center text-gray-400 text-sm mt-10">今月のシフトはありません</p>
                        ) : (
                            shifts.map(shift => {
                                const d = new Date(shift.date);
                                const dateStr = `${d.getMonth() + 1}/${d.getDate()} (${["日", "月", "火", "水", "木", "金", "土"][d.getDay()]})`;
                                const atts = getShiftAttendances(shift.date);
                                const isFuture = new Date(shift.date) > new Date();

                                const clockIn = atts.find(a => a.type === 'CLOCK_IN');
                                const clockOut = atts.find(a => a.type === 'CLOCK_OUT');
                                const wakeUp = atts.find(a => a.type === 'WAKE_UP');
                                const leave = atts.find(a => a.type === 'LEAVE');

                                return (
                                    <div key={shift.id} className="border border-gray-100 rounded-xl p-4 shadow-sm hover:border-emerald-100 transition-colors">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="font-bold text-gray-800 text-sm">{dateStr}</span>
                                            <span className="flex items-center gap-1 text-[11px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded">
                                                <MapPin size={10} /> {shift.location}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-gray-50 pb-3 mb-3">
                                            <span className="text-xs font-bold text-gray-400">予定</span>
                                            <span className="text-sm font-black text-gray-700">{shift.start_time.substring(0, 5)} 〜 {shift.end_time.substring(0, 5)}</span>
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-gray-400">出退勤</span>
                                            {isFuture ? (
                                                <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full text-center">予定</span>
                                            ) : (
                                                <div className="flex flex-col gap-1 items-end">
                                                    <div className="flex items-center gap-2">
                                                        {wakeUp && (
                                                            <span className="text-xs text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded flex items-center shadow-sm border border-amber-100">
                                                                <Sun size={12} className="mr-1" /> 起床 {new Date(wakeUp.timestamp!).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        )}
                                                        {leave && (
                                                            <span className="text-xs text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded flex items-center shadow-sm border border-blue-100">
                                                                <Navigation size={12} className="mr-1" /> 出発 {new Date(leave.timestamp!).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {clockIn ? (
                                                            <span className="text-xs font-bold text-emerald-600 flex items-center"><Play size={12} className="mr-0.5" /> {new Date(clockIn.timestamp!).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                                                        ) : (
                                                            <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded flex items-center"><UserX size={10} className="mr-0.5" /> 未出勤</span>
                                                        )}
                                                        <span className="text-gray-300">〜</span>
                                                        {clockOut ? (
                                                            <span className="text-xs font-bold text-blue-600 flex items-center"><Square size={12} className="mr-0.5" /> {new Date(clockOut.timestamp!).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                                                        ) : clockIn && !isFuture ? (
                                                            <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">未退勤</span>
                                                        ) : (
                                                            <span className="text-gray-300 text-xs">--:--</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* プランニング情報 */}
                                        {(shift.planned_wake_up_time || shift.planned_leave_time || shift.daily_memo) && (
                                            <div className="mt-3 pt-3 border-t border-gray-50">
                                                <span className="text-xs font-bold text-gray-400 block mb-2">プランニング</span>
                                                <div className="flex flex-wrap gap-2">
                                                    {shift.planned_wake_up_time && (
                                                        <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-full border border-purple-100">
                                                            ⏰ 起床予定 {shift.planned_wake_up_time.substring(0, 5)}
                                                        </span>
                                                    )}
                                                    {shift.planned_leave_time && (
                                                        <span className="text-[10px] font-bold text-cyan-600 bg-cyan-50 px-2 py-1 rounded-full border border-cyan-100">
                                                            🚗 出発予定 {shift.planned_leave_time.substring(0, 5)}
                                                        </span>
                                                    )}
                                                </div>
                                                {shift.daily_memo && (
                                                    <p className="text-[11px] text-gray-600 mt-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                                                        📝 {shift.daily_memo}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* 位置情報 */}
                                        {!isFuture && (() => {
                                            const locationAtts = atts.filter(a => a.latitude && a.longitude);
                                            if (locationAtts.length === 0) return null;
                                            return (
                                                <div className="mt-3 pt-3 border-t border-gray-50">
                                                    <span className="text-xs font-bold text-gray-400 block mb-2">📍 位置情報</span>
                                                    <div className="flex flex-wrap gap-2">
                                                        {locationAtts.map((att, i) => {
                                                            const typeLabel = att.type === 'CLOCK_IN' ? '出勤' : att.type === 'CLOCK_OUT' ? '退勤' : att.type === 'WAKE_UP' ? '起床' : '出発';
                                                            const mapsUrl = `https://www.google.com/maps?q=${att.latitude},${att.longitude}`;
                                                            return (
                                                                <a
                                                                    key={i}
                                                                    href={mapsUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100 hover:bg-emerald-100 transition-colors flex items-center gap-1"
                                                                >
                                                                    <MapPin size={10} />
                                                                    {typeLabel} 地点を確認
                                                                </a>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* 右列：交通費申請 */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[600px]">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                        <Receipt size={18} className="text-emerald-500" />
                        <h2 className="font-bold text-gray-700">交通費申請ログ ({expenses.length}件)</h2>
                    </div>
                    <div className="p-4 overflow-y-auto flex-1 space-y-4">
                        {expenses.length === 0 ? (
                            <p className="text-center text-gray-400 text-sm mt-10">今月の交通費申請はありません</p>
                        ) : (
                            expenses.map(exp => {
                                const d = new Date(exp.target_date);
                                const dateStr = `${d.getMonth() + 1}/${d.getDate()} (${["日", "月", "火", "水", "木", "金", "土"][d.getDay()]})`;

                                return (
                                    <div key={exp.id} className="border border-gray-100 rounded-xl p-4 shadow-sm">
                                        <div className="flex justify-between items-start mb-2 border-b border-gray-50 pb-2">
                                            <div>
                                                <span className="font-bold text-gray-800 text-sm">{dateStr}</span>
                                                <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${exp.is_round_trip ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                                    {exp.is_round_trip ? '往復' : '片道'}
                                                </span>
                                            </div>
                                            <span className="font-black text-gray-800 text-lg">¥{exp.amount.toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-sm font-bold text-gray-600 mt-1">
                                            {exp.transport_type === 'TRAIN' ? '🚃' : '🚌'}
                                            <span className="truncate max-w-[100px]">{exp.departure}</span>
                                            <span className="text-gray-300">→</span>
                                            <span className="truncate max-w-[100px]">{exp.arrival}</span>
                                        </div>
                                        {exp.purpose && (
                                            <p className="text-[11px] text-gray-400 mt-1.5 font-medium truncate">{exp.purpose}</p>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
}
