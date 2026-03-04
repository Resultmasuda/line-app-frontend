import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    const { data, error } = await supabase.from('holiday_requests').insert([
        { user_id: 'c42cb255-d3ad-4712-87db-2fded096e2a2', date: '2026-03-10', reason: '検証用' }
    ]).select();
    console.log('Result:', data, error);
}
check();
