const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function debugUsers() {
    try {
        const envFile = fs.readFileSync('.env.local', 'utf8');
        const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
        const keyMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

        if (!urlMatch || !keyMatch) {
            console.error("Could not find Supabase URL or Key in .env.local");
            return;
        }

        const url = urlMatch[1].trim().replace(/^"|"$/g, '');
        const key = keyMatch[1].trim().replace(/^"|"$/g, '');

        console.log("Connecting to:", url);
        const supabase = createClient(url, key);

        const { data, error } = await supabase.from('users').select('*');

        if (error) {
            console.error("Supabase Error:", error);
            return;
        }

        console.log(`Found ${data.length} users.`);
        fs.writeFileSync('all_users.json', JSON.stringify(data, null, 2));
        console.log("Saved all users to all_users.json");

        data.forEach(user => {
            console.log(`- ${user.display_name} (${user.role}): ${user.line_user_id}`);
        });

    } catch (e) {
        console.error("Script Error:", e);
    }
}

debugUsers();
