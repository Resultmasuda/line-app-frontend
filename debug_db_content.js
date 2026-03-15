
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugDb() {
    console.log('--- DB Data Debug ---');
    try {
        const { data, error } = await supabase
            .rpc('debug_list_all_phone_numbers');

        if (error) {
            console.error('Debug RPC Error:', error);
            console.log('Maybe SQL v4 is not applied yet?');
        } else {
            console.log('Table Content (users):');
            data.forEach(u => {
                console.log(`Phone: [${u.phone}], Linked: ${u.is_linked}, Role: ${u.role_val}`);
            });
        }
    } catch (err) {
        console.error('Execution failed:', err);
    }
}

debugDb();
