import { supabase } from '../supabase';

export interface ExpenseRecord {
    user_id: string;
    target_date: string;
    transport_type: string;
    departure: string;
    arrival: string;
    is_round_trip: boolean;
    amount: number;
    purpose?: string;
}

/**
 * 交通費入力データをSupabaseに保存する関数
 */
export async function saveExpense(data: ExpenseRecord) {
    try {
        const { data: result, error } = await supabase
            .from('expenses')
            .insert([
                {
                    user_id: data.user_id,
                    target_date: data.target_date,
                    transport_type: data.transport_type,
                    departure: data.departure,
                    arrival: data.arrival,
                    is_round_trip: data.is_round_trip,
                    amount: data.amount,
                    purpose: data.purpose,
                }
            ])
            .select()
            .single();

        if (error) throw error;
        return { success: true, data: result };
    } catch (error) {
        console.error('Error saving expense:', error);
        return { success: false, error };
    }
}

/**
 * 指定したユーザーの当月の交通費履歴を取得する関数
 */
export async function getMonthlyExpenses(userId: string, yearMonthPrefix: string) {
    try {
        const { data, error } = await supabase
            .from('expenses')
            .select('*')
            .eq('user_id', userId)
            .like('target_date', `${yearMonthPrefix}-%`) // 例: "2026-02-%"
            .order('target_date', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching expenses:', error);
        return { success: false, error, data: [] };
    }
}
