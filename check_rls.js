
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkRls() {
    const tables = ['users', 'locations', 'shifts', 'user_permissions', 'attendances', 'expenses'];
    
    console.log('--- Checking RLS Policies ---');
    for (const table of tables) {
        const { data, error } = await supabase.rpc('execute_sql_query', {
            sql_text: `SELECT row_security_active FROM pg_tables WHERE tablename = '${table}' AND schemaname = 'public';`
        });
        
        if (error) {
            console.log(`Error checking ${table} RLS status:`, error.message);
        } else {
            const isActive = data && data.length > 0 ? data[0].row_security_active : 'unknown';
            console.log(`Table: ${table}, RLS Active: ${isActive}`);
        }

        const { data: policies, error: polError } = await supabase.rpc('execute_sql_query', {
            sql_text: `SELECT policyname, permissive, roles, cmd, qual FROM pg_policies WHERE tablename = '${table}' AND schemaname = 'public';`
        });

        if (polError) {
            console.log(`Error checking ${table} policies:`, polError.message);
        } else if (policies) {
            console.log(`Policies for ${table}:`);
            policies.forEach(p => console.log(`  - ${p.policyname} (${p.cmd}) [${p.roles.join(', ')}]`));
        }
        console.log('-----------------------------');
    }
}

checkRls();
