import { supabase } from '../supabase';

export interface ShiftRecord {
    id: string;
    user_id: string;
    date: string;
    location: string;
    start_time: string;
    end_time: string;
    memo?: string;
    status?: string;
    shift_type?: string;
    planned_wake_up_time?: string | null;
    planned_leave_time?: string | null;
    daily_memo?: string | null;
}

export interface HolidayRequest {
    id: string;
    user_id: string;
    date: string;
    reason?: string | null;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    created_at: string;
}

/**
 * 指定したユーザーの当月のシフト一覧を取得する関数
 */
export async function getMonthlyShifts(userId: string, yearMonthPrefix: string) {
    try {
        const [year, month] = yearMonthPrefix.split('-');
        const lastDay = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
        const startDate = `${yearMonthPrefix}-01`;
        const endDate = `${yearMonthPrefix}-${lastDay}`;

        const { data, error } = await supabase
            .from('shifts')
            .select('*')
            .eq('user_id', userId)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching shifts:', error);
        return { success: false, error, data: [] };
    }
}

/**
 * 指定したユーザーの「今日以降」の最新シフトを取得する関数 (ホーム画面用)
 */
export async function getUpcomingShifts(userId: string, limit: number = 2) {
    try {
        // 現在の日付文字列を取得 (YYYY-MM-DD)
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('shifts')
            .select('*')
            .eq('user_id', userId)
            .gte('date', today) // 今日以降
            .order('date', { ascending: true })
            .limit(limit);

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching upcoming shifts:', error);
        return { success: false, error, data: [] };
    }
}

/**
 * ユーザーの希望休申請を取得する関数
 */
export async function getHolidayRequests(userId: string, yearMonthPrefix: string) {
    try {
        const [year, month] = yearMonthPrefix.split('-');
        const lastDay = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
        const startDate = `${yearMonthPrefix}-01`;
        const endDate = `${yearMonthPrefix}-${lastDay}`;

        const { data, error } = await supabase
            .from('holiday_requests')
            .select('*')
            .eq('user_id', userId)
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

/**
 * 希望休申請を作成する関数
 */
export async function createHolidayRequest(request: Omit<HolidayRequest, 'id' | 'created_at' | 'status'>) {
    try {
        const { data, error } = await supabase
            .from('holiday_requests')
            .insert([{ ...request, status: 'PENDING' }])
            .select()
            .single();

        if (error) throw error;
        return { success: true, data: data as HolidayRequest };
    } catch (error) {
        console.error('Error creating holiday request:', error);
        return { success: false, error, data: null };
    }
}
/**
 * シフトの予定（起床・出発・メモ）を更新する関数
 */
export async function updateShiftPlanning(shiftId: string, data: {
    planned_wake_up_time?: string | null;
    planned_leave_time?: string | null;
    daily_memo?: string | null;
}) {
    try {
        const { data: result, error } = await supabase
            .from('shifts')
            .update(data)
            .eq('id', shiftId)
            .select()
            .single();

        if (error) throw error;
        return { success: true, data: result };
    } catch (error) {
        console.error('Error updating shift planning:', error);
        return { success: false, error, data: null };
    }
}

/**
 * 指定された店舗と日付のシフト（メモや予定時間、スタッフ名含む）を取得する
 */
export async function getStoreTodayShiftsWithMemos(storeName: string, date: string) {
    try {
        const { data, error } = await supabase
            .from('shifts')
            .select(`
                id,
                user_id,
                date,
                location,
                start_time,
                end_time,
                planned_wake_up_time,
                planned_leave_time,
                daily_memo,
                users (display_name)
            `)
            .eq('location', storeName)
            .eq('date', date)
            .order('start_time', { ascending: true });

        if (error) throw error;
        return { success: true, data: data as any[] };
    } catch (error) {
        console.error('Error fetching store today shifts:', error);
        return { success: false, error, data: null };
    }
}
