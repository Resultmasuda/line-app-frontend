const { Client } = require('pg');

async function migratePhaseU() {
    const connectionString = "postgres://postgres.opodugvzphjyiwowdrdj:sW7wK%23TdfnL2R%40w@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres";
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("Connected to PostgreSQL successfully!");

        console.log("--- Running Migration Phase U ---");
        // 1. shiftsテーブルへのカラム追加
        // 2. storesテーブルへのカラム追加
        // 3. インデックスの追加
        await client.query(`
            ALTER TABLE public.shifts 
            ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft',
            ADD COLUMN IF NOT EXISTS planned_wake_up_time TIME,
            ADD COLUMN IF NOT EXISTS planned_leave_time TIME,
            ADD COLUMN IF NOT EXISTS daily_memo TEXT;

            ALTER TABLE public.stores 
            ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'store';

            CREATE INDEX IF NOT EXISTS idx_shifts_status ON public.shifts(status);
            CREATE INDEX IF NOT EXISTS idx_stores_type ON public.stores(type);
        `);
        console.log("Migration Phase U successful.");

    } catch (err) {
        console.error("Error during migration:", err);
    } finally {
        await client.end();
    }
}

migratePhaseU();
