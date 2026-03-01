const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data, error } = await supabase.rpc('execute_sql_query', {
        sql_text: `
      CREATE TABLE IF NOT EXISTS public.stores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        radius_m INTEGER NOT NULL DEFAULT 500,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );

      ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Allow full access to stores" ON public.stores FOR ALL USING (true);
    `
    });

    if (error) {
        console.error('Error executing query via RPC:', error);
        process.exit(1);
    } else {
        console.log('Query executed successfully.', data);
    }
}

run();
