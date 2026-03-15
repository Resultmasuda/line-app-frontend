
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkRyota() {
    const ryotaId = 'c42cb255-d3ad-41cb-9b48-e6ffcd2f6648';
    
    console.log('--- Checking Ryota DB State ---');
    const { data, error } = await supabase
        .from('users')
        .select('id, display_name, role, line_user_id')
        .eq('id', ryotaId)
        .single();
        
    if (error) {
        console.error('Error fetching Ryota:', error);
    } else {
        console.log('Ryota User Info:', data);
    }
}

checkRyota();
