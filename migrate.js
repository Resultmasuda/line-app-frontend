const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
    const { data, error } = await supabase.rpc('execute_sql', {
        query: 'ALTER TABLE public.users ALTER COLUMN line_user_id DROP NOT NULL;'
    });
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Success:', data);
    }
}

run();
