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

async function cleanup() {
    // 1. テストデータ「松田(テスト)」を削除
    console.log("1. Deleting test user...");
    const { error: delErr } = await supabase
        .from('users')
        .delete()
        .eq('id', '11c7995b-fa54-44b4-9c01-f17585f48489');

    if (delErr) console.error("Delete error:", delErr);
    else console.log("   Deleted test user successfully.");

    // 2. 下田の重複レコードを統合する
    //    - 事前登録レコード (id: 579596d6, role: ADMIN, line_user_id: null)
    //    - LINE経由レコード (id: c16ad7ce, line_user_id: Ud226..., role: STAFF)
    //    事前登録レコードにLINE IDを紐付けて、LINE経由レコードを削除する
    console.log("2. Merging duplicate records for Shimoda...");

    const shimoda_line_id = 'Ud226e4e55173fae7ab4f03ceb333d6ac';
    const shimoda_preregistered_id = '579596d6-5e9e-4162-8aa3-9ada8965348a';
    const shimoda_duplicate_id = 'c16ad7ce-fe15-4b6e-995e-53e5668f0d37';

    // まず重複したLINE経由レコードを削除
    const { error: delDupErr } = await supabase
        .from('users')
        .delete()
        .eq('id', shimoda_duplicate_id);

    if (delDupErr) console.error("Delete duplicate error:", delDupErr);
    else console.log("   Deleted duplicate LINE record.");

    // 事前登録レコードにLINE IDと表示名を紐付け
    const { data: updated, error: updateErr } = await supabase
        .from('users')
        .update({
            line_user_id: shimoda_line_id,
            display_name: '下田'  // Keep the pre-registered name
        })
        .eq('id', shimoda_preregistered_id)
        .select();

    if (updateErr) console.error("Update error:", updateErr);
    else console.log("   Linked LINE account to pre-registered record:", JSON.stringify(updated, null, 2));

    // 3. 最終確認
    console.log("\n3. Final user list:");
    const { data: allUsers } = await supabase
        .from('users')
        .select('id, display_name, role, line_user_id')
        .order('display_name', { ascending: true });
    console.log(JSON.stringify(allUsers, null, 2));
}

cleanup();
