const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://opodugvzphjyiwowdrdj.supabase.co";
const supabaseKey = "sb_publishable_JeEi2b0RIHQIEgVoEdGH1A_0qVRib7g";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Starting migration...');
    const { data, error } = await supabase.rpc('execute_sql_query', {
        sql_text: `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS presets JSONB DEFAULT '[]'::jsonb;`
    });

    if (error) {
        console.error('Error executing query via RPC:', error);
        process.exit(1);
    } else {
        console.log('Query executed successfully.', data);
    }
}

run();
