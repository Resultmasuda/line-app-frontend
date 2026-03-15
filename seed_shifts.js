const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://opodugvzphjyiwowdrdj.supabase.co';
const supabaseKey = 'sb_publishable_JeEi2b0RIHQIEgVoEdGH1A_0qVRib7g';
const supabase = createClient(supabaseUrl, supabaseKey);

async function seedAll() {
    console.log('Fetching users...');
    const { data: users, error: userError } = await supabase.from('users').select('id');

    if (userError) {
        console.error('Error fetching users:', userError);
        return;
    }

    console.log(`Found ${users.length} users. Inserting shifts...`);

    for (const user of users) {
        // First delete existing dummy shifts to avoid duplicates
        await supabase.from('shifts').delete().eq('user_id', user.id).eq('location', '京都ヨドバシ');
        await supabase.from('shifts').delete().eq('user_id', user.id).eq('location', '梅田エディオン');
        await supabase.from('shifts').delete().eq('user_id', user.id).eq('location', 'なんばビックカメラ');
        await supabase.from('shifts').delete().eq('user_id', user.id).eq('location', 'オンライン研修');

        const shifts = [
            { user_id: user.id, date: '2026-03-02', location: '京都ヨドバシ', start_time: '10:00:00', end_time: '19:00:00', memo: '通常番' },
            { user_id: user.id, date: '2026-03-05', location: '梅田エディオン', start_time: '11:00:00', end_time: '20:00:00', memo: '遅番' },
            { user_id: user.id, date: '2026-03-10', location: '京都ヨドバシ', start_time: '10:00:00', end_time: '19:00:00', memo: '' },
            { user_id: user.id, date: '2026-03-15', location: 'なんばビックカメラ', start_time: '10:00:00', end_time: '19:00:00', memo: '' },
            { user_id: user.id, date: '2026-03-01', location: 'オンライン研修', start_time: '13:00:00', end_time: '15:00:00', memo: 'Zoom接続' }
        ];

        const { error } = await supabase.from('shifts').insert(shifts);
        if (error) {
            console.error(`Error inserting for ${user.id}:`, error);
        } else {
            console.log(`Inserted 5 shifts for ${user.id}`);
        }
    }
    console.log('Done seeding shifts.');
}

seedAll();
