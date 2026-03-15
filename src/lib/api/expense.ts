import { supabase } from '../supabase';

export interface ExpenseRecord {
    id?: string;
    user_id: string;
    target_date: string;
    transport_type: string;
    departure: string;
    arrival: string;
    is_round_trip: boolean;
    amount: number;
    purpose?: string;
}

export interface ExpenseTemplateRecord {
    id?: string;
    user_id: string;
    template_name: string;
    transport_type: string;
    departure: string;
    arrival: string;
    is_round_trip: boolean;
    amount: number;
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
        const [year, month] = yearMonthPrefix.split('-');
        const lastDay = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
        const startDate = `${yearMonthPrefix}-01`;
        const endDate = `${yearMonthPrefix}-${lastDay}`;

        const { data, error } = await supabase
            .from('expenses')
            .select('*')
            .eq('user_id', userId)
            .gte('target_date', startDate)
            .lte('target_date', endDate)
            .order('target_date', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching expenses:', error);
        return { success: false, error, data: [] };
    }
}

/**
 * よく使う経路（テンプレート）を保存する関数
 */
export async function saveExpenseTemplate(data: ExpenseTemplateRecord) {
    try {
        const { data: result, error } = await supabase
            .from('expense_templates')
            .insert([
                {
                    user_id: data.user_id,
                    template_name: data.template_name,
                    transport_type: data.transport_type,
                    departure: data.departure,
                    arrival: data.arrival,
                    is_round_trip: data.is_round_trip,
                    amount: data.amount,
                }
            ])
            .select()
            .single();

        if (error) throw error;
        return { success: true, data: result };
    } catch (error) {
        console.error('Error saving expense template:', error);
        return { success: false, error };
    }
}

/**
 * 指定したユーザーのよく使う経路（テンプレート）を取得する関数
 */
export async function getExpenseTemplates(userId: string) {
    try {
        const { data, error } = await supabase
            .from('expense_templates')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching expense templates:', error);
        return { success: false, error, data: [] };
    }
}

/**
 * よく使う経路（テンプレート）を削除する関数
 */
export async function deleteExpenseTemplate(id: string) {
    try {
        const { error } = await supabase
            .from('expense_templates')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error deleting expense template:', error);
        return { success: false, error };
    }
}

/**
 * 交通費入力データを更新する関数
 */
export async function updateExpense(id: string, data: Partial<ExpenseRecord>) {
    try {
        const { data: result, error } = await supabase
            .from('expenses')
            .update(data)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return { success: true, data: result };
    } catch (error) {
        console.error('Error updating expense:', error);
        return { success: false, error };
    }
}

/**
 * 交通費入力データを削除する関数
 */
export async function deleteExpense(id: string) {
    try {
        const { error } = await supabase
            .from('expenses')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error deleting expense:', error);
        return { success: false, error };
    }
}
