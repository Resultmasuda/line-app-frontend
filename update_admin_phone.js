const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
    const phoneNumber = '08021546659';
    const namesArray = ['増田', 'りょーた'];

    for (const partialName of namesArray) {
        console.log(`Updating phone number for users matching: ${partialName}`);

        // Find users matching the name
        const { data: users, error: findError } = await supabase
            .from('users')
            .select('id, display_name')
            .ilike('display_name', `%${partialName}%`);

        if (findError) {
            console.error('Error finding user:', findError);
            continue;
        }

        if (!users || users.length === 0) {
            console.log(`No users found containing: ${partialName}`);
            continue;
        }

        for (const user of users) {
            console.log(`Found user: ${user.display_name} (ID: ${user.id})`);

            const { error: updateError } = await supabase
                .from('users')
                .update({ phone_number: phoneNumber })
                .eq('id', user.id);

            if (updateError) {
                // Ignore duplicate phone number errors if they already exist, or log them
                console.error(`Error updating phone number for ${user.display_name}:`, updateError.message);
            } else {
                console.log(`Successfully updated phone number for ${user.display_name}`);
            }
        }
    }
}

main().catch(console.error);
