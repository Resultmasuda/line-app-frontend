import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://opodugvzphjyiwowdrdj.supabase.co';
const supabaseKey = 'sb_publishable_JeEi2b0RIHQIEgVoEdGH1A_0qVRib7g';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log('Testing public.expenses table query...');
    const all = await supabase.from('expenses').select('*');
    console.log('All expenses:', all.data?.length, 'records');

    // mimic getMonthlyExpenses
    const res = await supabase
        .from('expenses')
        .select('*')
        .like('target_date', `2026-02-%`)
        .order('target_date', { ascending: false })
        .order('created_at', { ascending: false });
    console.log('Filtered expenses:', res.data?.length, 'error:', res.error);
}

test();
