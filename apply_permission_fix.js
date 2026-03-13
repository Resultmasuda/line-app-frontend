
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runFix() {
    const sqlPath = path.join(__dirname, 'fix_permissions_final.sql');
    const sqlText = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running final permission fix SQL...');
    
    // We try to use the execute_sql_query RPC which seems to be available in this project
    const { data, error } = await supabase.rpc('execute_sql_query', {
        sql_text: sqlText
    });

    if (error) {
        console.error('Error executing query via RPC:', error);
        process.exit(1);
    } else {
        console.log('Permission fix SQL executed successfully.', data);
    }
}

runFix();
