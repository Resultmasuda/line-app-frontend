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

async function promote() {
    const ids = [
        'c42cb255-d3ad-41cb-9b48-e6ffcd2f6648',  // りょーた
        '87e75b91-210c-41bb-9cc3-cc7850d473d4'   // 増田 涼太
    ];

    for (const id of ids) {
        const { error } = await supabase
            .from('users')
            .update({ role: 'ADMIN' })
            .eq('id', id);

        if (error) console.error('Error:', error);
        else console.log('Promoted', id, 'to ADMIN');
    }

    // Verify
    const { data } = await supabase
        .from('users')
        .select('id, display_name, role')
        .order('display_name');
    console.log(JSON.stringify(data, null, 2));
}

promote();
