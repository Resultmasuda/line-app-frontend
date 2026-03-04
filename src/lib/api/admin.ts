import { supabase } from '../supabase';

export interface AdminUserRecord {
    id: string;
    display_name: string;
    role: string;
    line_user_id: string | null;
    phone_number: string | null;
    pin_code: string | null;
    created_at: string;
}

export interface HolidayRequest {
    id: string;
    user_id: string;
    date: string;
    reason?: string | null;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    created_at: string;
    users?: { display_name: string };
}
export interface StoreRecord {
    id: string;
    name: string;
    latitude?: number | null;
    longitude?: number | null;
    radius_m?: number | null;
    affiliated_staff?: string[];
    presets?: { label: string; start: string; end: string; color: string }[];
    type?: string;
}


export type ShiftRecord = {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    location: string;
    user_id: string;
    users?: { display_name: string };
    status?: string;
    planned_wake_up_time?: string | null;
    planned_leave_time?: string | null;
    daily_memo?: string | null;
    shift_type?: string;
};

// RLSの「authenticatedユーザーは自分の情報しか見れない」制限を回避するため、
// 管理者画面用のスタッフ一覧取得は、認証セッションを持たない（anonとなる）別クライアントを使います。
import { createClient } from '@supabase/supabase-js';
const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) }
    }
);

export async function getAllUsers() {
    try {
        const { data, error } = await supabaseAnon
            .from('users')
            .select('id, display_name, role, line_user_id, phone_number')
            .order('display_name', { ascending: true });

        if (error) throw error;
        return { success: true, data: data as AdminUserRecord[] };
    } catch (error) {
        console.error('Error fetching all users:', error);
        return { success: false, error, data: [] };
    }
}

export async function getUserProfile(userId: string) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return { success: true, data: data as AdminUserRecord };
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return { success: false, error, data: null };
    }
}

export async function createPreRegisteredUser(displayName: string, role: string, phoneNumber: string) {
    try {
        const { data, error } = await supabase
            .from('users')
            .insert([{ display_name: displayName, role, phone_number: phoneNumber }])
            .select()
            .single();

        if (error) throw error;
        return { success: true, data: data as AdminUserRecord };
    } catch (error) {
        console.error('Error creating pre-registered user:', error);
        return { success: false, error, data: null };
    }
}

export async function updateUserRole(userId: string, role: string) {
    try {
        const { data, error } = await supabase
            .from('users')
            .update({ role })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return { success: true, data: data as AdminUserRecord };
    } catch (error) {
        console.error('Error updating user role:', error);
        return { success: false, error };
    }
}

export async function updateUserDisplayName(userId: string, displayName: string) {
    try {
        const { data, error } = await supabase
            .from('users')
            .update({ display_name: displayName })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return { success: true, data: data as AdminUserRecord };
    } catch (error) {
        console.error('Error updating user display name:', error);
        return { success: false, error };
    }
}

export async function updateUserPhoneNumber(userId: string, phoneNumber: string) {
    try {
        const { data, error } = await supabase
            .from('users')
            .update({ phone_number: phoneNumber })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return { success: true, data: data as AdminUserRecord };
    } catch (error) {
        console.error('Error updating user phone number:', error);
        return { success: false, error };
    }
}

export async function unlinkUserLineId(userId: string) {
    try {
        const { data, error } = await supabase
            .from('users')
            .update({ line_user_id: null })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return { success: true, data: data as AdminUserRecord };
    } catch (error) {
        console.error('Error unlinking user LINE ID:', error);
        return { success: false, error };
    }
}

export async function updateUserPinCode(userId: string, pinCode: string | null) {
    try {
        const { data, error } = await supabase
            .from('users')
            .update({ pin_code: pinCode })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return { success: true, data: data as AdminUserRecord };
    } catch (error) {
        console.error('Error updating user PIN code:', error);
        return { success: false, error };
    }
}

export async function deleteUser(userId: string) {
    try {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', userId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error deleting user:', error);
        return { success: false, error };
    }
}

export async function getTodayAllAttendances(dateStr: string) {
    try {
        const { data, error } = await supabase
            .from('attendances')
            .select('*, users(display_name)')
            .eq('date', dateStr)
            .order('timestamp', { ascending: true });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching today attendances:', error);
        return { success: false, error, data: [] };
    }
}

export async function getAllAttendances(yearMonthPrefix: string) {
    try {
        const [year, month] = yearMonthPrefix.split('-');
        const lastDay = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
        const startDate = `${yearMonthPrefix}-01`;
        const endDate = `${yearMonthPrefix}-${lastDay}`;

        const { data, error } = await supabase
            .from('attendances')
            .select('*, users(display_name)')
            .gte('date', startDate)
            .lte('date', endDate)
            .order('timestamp', { ascending: true });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching all attendances:', error);
        return { success: false, error, data: [] };
    }
}

export async function getAllExpenses(yearMonthPrefix: string) {
    try {
        const [year, month] = yearMonthPrefix.split('-');
        const lastDay = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
        const startDate = `${yearMonthPrefix}-01`;
        const endDate = `${yearMonthPrefix}-${lastDay}`;

        const { data, error } = await supabase
            .from('expenses')
            .select('*, users(display_name)')
            .gte('target_date', startDate)
            .lte('target_date', endDate)
            .order('target_date', { ascending: false });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching all expenses:', error);
        return { success: false, error, data: [] };
    }
}

export async function getAllShifts(yearMonthPrefix: string) {
    try {
        const [year, month] = yearMonthPrefix.split('-');
        const lastDay = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
        const startDate = `${yearMonthPrefix}-01`;
        const endDate = `${yearMonthPrefix}-${lastDay}`;

        const { data, error } = await supabase
            .from('shifts')
            .select('*, users(display_name)')
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching all shifts:', error);
        return { success: false, error, data: [] };
    }
}

export async function createShift(shift: Omit<ShiftRecord, 'id' | 'users'>) {
    try {
        const { data, error } = await supabase
            .from('shifts')
            .insert([shift])
            .select('*, users(display_name)')
            .single();

        if (error) throw error;
        return { success: true, data: data as ShiftRecord };
    } catch (error) {
        console.error('Error creating shift:', error);
        return { success: false, error, data: null };
    }
}

export async function updateShift(id: string, shift: Partial<Omit<ShiftRecord, 'id' | 'users'>>) {
    try {
        const { data, error } = await supabase
            .from('shifts')
            .update(shift)
            .eq('id', id)
            .select('*, users(display_name)')
            .single();

        if (error) throw error;
        return { success: true, data: data as ShiftRecord };
    } catch (error) {
        console.error('Error updating shift:', error);
        return { success: false, error, data: null };
    }
}

export async function deleteShift(id: string) {
    try {
        const { error } = await supabase
            .from('shifts')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error deleting shift:', error);
        return { success: false, error };
    }
}

// ==========================================
// Phase F: 店舗マスター管理API
// ==========================================

export async function getAllStores() {
    try {
        const { data, error } = await supabase
            .from('stores')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        return { success: true, data: data as StoreRecord[] };
    } catch (error) {
        console.error('Error fetching stores:', error);
        return { success: false, error, data: [] };
    }
}

export async function createStore(store: Omit<StoreRecord, 'id'>) {
    try {
        const { data, error } = await supabase
            .from('stores')
            .insert([store])
            .select()
            .single();

        if (error) throw error;
        return { success: true, data: data as StoreRecord };
    } catch (error) {
        console.error('Error creating store:', error);
        return { success: false, error, data: null };
    }
}

export async function updateStore(id: string, store: Partial<Omit<StoreRecord, 'id'>>) {
    try {
        const { data, error } = await supabase
            .from('stores')
            .update(store)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return { success: true, data: data as StoreRecord };
    } catch (error) {
        console.error('Error updating store:', error);
        return { success: false, error, data: null };
    }
}

export async function deleteStore(id: string) {
    try {
        const { error } = await supabase
            .from('stores')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error deleting store:', error);
        return { success: false, error };
    }
}

/**
 * スタッフを特定の店舗に紐付ける（招待リンク用）
 */
export async function joinStore(storeId: string, userId: string) {
    try {
        // 現在の所属スタッフを取得
        const { data: store, error: fetchError } = await supabase
            .from('stores')
            .select('affiliated_staff')
            .eq('id', storeId)
            .single();

        if (fetchError) throw fetchError;

        const currentStaff = store.affiliated_staff || [];
        if (currentStaff.includes(userId)) return { success: true, message: 'Already joined' };

        const { error: updateError } = await supabase
            .from('stores')
            .update({ affiliated_staff: [...currentStaff, userId] })
            .eq('id', storeId);

        if (updateError) throw updateError;
        return { success: true };
    } catch (error) {
        console.error('Error joining store:', error);
        return { success: false, error };
    }
}

export async function getStorePresets(storeId: string) {
    try {
        const { data, error } = await supabase
            .from('stores')
            .select('presets')
            .eq('id', storeId)
            .single();

        if (error) throw error;
        return { success: true, data: data?.presets || [] };
    } catch (error) {
        console.error('Error fetching store presets:', error);
        return { success: false, error, data: [] };
    }
}

export async function updateStorePresets(storeId: string, presets: any[]) {
    try {
        const { data, error } = await supabase
            .from('stores')
            .update({ presets })
            .eq('id', storeId)
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error updating store presets:', error);
        return { success: false, error };
    }
}

// ==========================================
// Advanced Shift Builder API
// ==========================================

export async function bulkUpsertShifts(shifts: (Omit<ShiftRecord, 'id'> & { id?: string })[]) {
    try {
        const { data, error } = await supabase
            .from('shifts')
            .upsert(shifts)
            .select();

        if (error) throw error;
        return { success: true, data: data as ShiftRecord[] };
    } catch (error) {
        console.error('Error bulk upserting shifts:', error);
        return { success: false, error, data: [] };
    }
}

export async function bulkDeleteShifts(shiftIds: string[]) {
    if (!shiftIds || shiftIds.length === 0) return { success: true };
    try {
        const { error } = await supabase
            .from('shifts')
            .delete()
            .in('id', shiftIds);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error bulk deleting shifts:', error);
        return { success: false, error };
    }
}

// ==========================================
// Holiday Requests API (Phase Q)
// ==========================================

export async function getHolidayRequests(yearMonthPrefix: string) {
    try {
        const [year, month] = yearMonthPrefix.split('-');
        const lastDay = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
        const startDate = `${yearMonthPrefix}-01`;
        const endDate = `${yearMonthPrefix}-${lastDay}`;

        const { data, error } = await supabase
            .from('holiday_requests')
            .select('*, users(display_name)')
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true });

        if (error) throw error;
        return { success: true, data: data as HolidayRequest[] };
    } catch (error) {
        console.error('Error fetching holiday requests:', error);
        return { success: false, error, data: [] };
    }
}

export async function createHolidayRequest(request: Omit<HolidayRequest, 'id' | 'created_at' | 'users' | 'status'>) {
    try {
        const { data, error } = await supabase
            .from('holiday_requests')
            .insert([request])
            .select()
            .single();

        if (error) throw error;
        return { success: true, data: data as HolidayRequest };
    } catch (error) {
        console.error('Error creating holiday request:', error);
        return { success: false, error, data: null };
    }
}

export async function updateHolidayRequestStatus(id: string, status: 'PENDING' | 'APPROVED' | 'REJECTED') {
    try {
        const { data, error } = await supabase
            .from('holiday_requests')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return { success: true, data: data as HolidayRequest };
    } catch (error) {
        console.error('Error updating holiday request status:', error);
        return { success: false, error, data: null };
    }
}

export async function getPendingHolidayRequests() {
    try {
        const { data, error } = await supabase
            .from('holiday_requests')
            .select('*, users(display_name)')
            .eq('status', 'PENDING')
            .order('created_at', { ascending: true });

        if (error) throw error;
        return { success: true, data: data as HolidayRequest[] };
    } catch (error) {
        console.error('Error fetching pending holiday requests:', error);
        return { success: false, error, data: [] };
    }
}

