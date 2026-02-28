import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://opodugvzphjyiwowdrdj.supabase.co';
const supabaseKey = 'sb_publishable_JeEi2b0RIHQIEgVoEdGH1A_0qVRib7g';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log('Testing public.users table...');
    const res1 = await supabase.from('users').select('*').limit(1);
    console.log('users select:', res1);

    const res1ins = await supabase.from('users').insert([{ line_user_id: 'test', display_name: 'test' }]).select();
    console.log('users insert:', res1ins);

    console.log('Testing public.profiles table...');
    const res2 = await supabase.from('profiles').select('*').limit(1);
    console.log('profiles select:', res2);
}

test();
