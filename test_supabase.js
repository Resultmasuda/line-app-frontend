const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://opodugvzphjyiwowdrdj.supabase.co';
const supabaseKey = 'sb_publishable_JeEi2b0RIHQIEgVoEdGH1A_0qVRib7g';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase.from('expenses').select('*');
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Expenses:', JSON.stringify(data, null, 2));
    }
}

check();
