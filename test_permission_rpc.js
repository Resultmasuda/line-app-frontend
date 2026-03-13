
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testPermissionRpc() {
    const operatorLineId = 'U5500ee9357c696d9363027566c54a3bd'; // Ryota's Line ID
    const targetUserId = '7a737d63-d182-48fe-a136-464d567c8188'; // Some staff ID
    const permission = 'MANAGE_SHIFTS';
    const locationId = null;
    const shouldEnable = true;

    console.log('--- Testing Permission RPC ---');
    console.log(`Operator: ${operatorLineId}, Target: ${targetUserId}`);

    const { data, error } = await supabase.rpc('toggle_user_permission_admin', {
        p_operator_line_id: operatorLineId,
        p_target_user_id: targetUserId,
        p_permission: permission,
        p_location_id: locationId,
        p_should_enable: shouldEnable
    });

    if (error) {
        console.error('RPC Error:', error);
    } else {
        console.log('RPC Response:', data);
    }
}

testPermissionRpc();
