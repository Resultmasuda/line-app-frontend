import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://opodugvzphjyiwowdrdj.supabase.co';
const supabaseKey = 'sb_publishable_JeEi2b0RIHQIEgVoEdGH1A_0qVRib7g';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log('Testing public.expenses table query...');
    const result = await supabase.from('expenses').select('*').limit(1);
    console.log('expenses sample:', result);
}

test();
