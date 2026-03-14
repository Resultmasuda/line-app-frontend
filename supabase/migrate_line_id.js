const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../frontend/.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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
