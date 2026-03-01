import { supabase } from '../supabase';

export interface AdminUserRecord {
    id: string;
    display_name: string;
    role: string;
}

export interface StoreRecord {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    radius_m: number;
}

export type ShiftRecord = {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    location: string;
    user_id: string;
    users?: { display_name: string };
};

export async function getAllUsers() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, display_name, role')
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
