import { supabase } from '../supabase';

export interface ShiftRecord {
    id: string;
    user_id: string;
    date: string;
    location: string;
    start_time: string;
    end_time: string;
    memo?: string;
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
