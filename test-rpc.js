
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRpc() {
    console.log('Testing find_unlinked_user_by_phone RPC...');
    const phoneNumber = '08051155389';

    try {
        const { data, error } = await supabase
            .rpc('find_unlinked_user_by_phone', { p_phone_number: phoneNumber });

        if (error) {
            console.error('RPC Error:', error);
        } else {
            console.log('RPC Success!');
            console.log('Data found:', data);
        }
    } catch (err) {
        console.error('Execution failed:', err);
    }
}

testRpc();
