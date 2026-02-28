import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://opodugvzphjyiwowdrdj.supabase.co';
const supabaseKey = 'sb_publishable_JeEi2b0RIHQIEgVoEdGH1A_0qVRib7g';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log('Testing public.expenses like query...');
    const result = await supabase.from('expenses').select('*').like('target_date', '2026-02-%');
    console.log('Result data length:', result.data?.length);
    console.log('Error:', result.error);
}

test();
