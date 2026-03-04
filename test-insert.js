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

async function testInsert() {
    console.log("Attempting to insert a user without line_user_id...");
    const { data, error } = await supabase
        .from('users')
        .insert([{ display_name: '松田(テスト)', role: 'STAFF' }])
        .select();

    if (error) {
        console.error("Insert Error:", JSON.stringify(error, null, 2));
    } else {
        console.log("Insert Success:", JSON.stringify(data, null, 2));
    }
}

testInsert();
