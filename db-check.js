const { Client } = require('pg');

async function testConnection() {
    const connectionString = "postgres://postgres.opodugvzphjyiwowdrdj:sW7wK%23TdfnL2R%40w@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres";
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("Connected to PostgreSQL successfully!");

        // 1. Check policies
        console.log("--- Policies for 'users' ---");
        const policies = await client.query(`
      SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'users';
    `);
        console.table(policies.rows);

        // 2. Perform Phase H Migration directly
        console.log("--- Running Migration ---");
        await client.query(`
      ALTER TABLE public.stores ALTER COLUMN latitude DROP NOT NULL;
      ALTER TABLE public.stores ALTER COLUMN longitude DROP NOT NULL;
      ALTER TABLE public.stores ALTER COLUMN radius_m DROP NOT NULL;
      ALTER TABLE public.stores ALTER COLUMN radius_m DROP DEFAULT;
      ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS affiliated_staff UUID[] DEFAULT '{}';
    `);
        console.log("Migration successful.");

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

testConnection();
