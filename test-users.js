const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');

let key = '';
for (const line of envFile.split('\n')) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
        key = line.split('=')[1].trim().replace(/^"|"$/g, '');
    }
}

const supabaseUrl = 'https://opodugvzphjyiwowdrdj.supabase.co';
const supabase = createClient(supabaseUrl, key);

async function test() {
    const { data, error } = await supabase
        .from('users')
        .select('id, display_name, role')
        .order('display_name', { ascending: true });

    console.log("Error:", error);
    console.log("Data length:", data ? data.length : 0);
    console.log(data);
}
test();
