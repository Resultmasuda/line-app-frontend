import { supabase } from '../supabase';

export type AttendanceType = 'WAKE_UP' | 'LEAVE' | 'CLOCK_IN' | 'CLOCK_OUT';

export interface AttendanceRecord {
    id?: string;
    user_id: string;
    date: string; // YYYY-MM-DD
    type: AttendanceType;
    timestamp?: string;
    latitude?: number | null;
    longitude?: number | null;
}

/**
 * 打刻データをSupabaseに保存する関数
 */
export async function recordAttendance(data: AttendanceRecord) {
    try {
        const { data: result, error } = await supabase
            .from('attendances')
            .insert([
                {
                    user_id: data.user_id,
                    date: data.date,
                    type: data.type,
                    latitude: data.latitude,
                    longitude: data.longitude,
                }
            ])
            .select()
            .single();

        if (error) throw error;
        return { success: true, data: result };
    } catch (error) {
        console.error('Error recording attendance:', error);
        return { success: false, error };
    }
}

/**
 * 指定したユーザーの今日の打刻履歴を取得する関数 (UI表示用)
 */
export async function getTodayAttendances(userId: string, dateStr: string) {
    try {
        const { data, error } = await supabase
            .from('attendances')
            .select('*')
            .eq('user_id', userId)
            .eq('date', dateStr)
            .order('timestamp', { ascending: true });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching attendances:', error);
        return { success: false, error, data: [] };
    }
}

/**
 * 指定したユーザーの月間打刻履歴を取得する関数 (管理画面・詳細ページ用)
 */
export async function getMonthlyAttendances(userId: string, yearMonthPrefix: string) {
    try {
        const [year, month] = yearMonthPrefix.split('-');
        const lastDay = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
        const startDate = `${yearMonthPrefix}-01`;
        const endDate = `${yearMonthPrefix}-${lastDay}`;

        const { data, error } = await supabase
            .from('attendances')
            .select('*')
            .eq('user_id', userId)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('timestamp', { ascending: true });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching monthly attendances:', error);
        return { success: false, error, data: [] };
    }
}
