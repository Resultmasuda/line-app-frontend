import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    if (typeof window === 'undefined') {
        console.warn('Supabase environment variables are missing during build/SSR.');
    }
}

// Supabaseクライアントのインスタンスを作成
export const supabase = createClient(
    supabaseUrl || 'https://placeholder-url.supabase.co',
    supabaseKey || 'placeholder-key',
    {
        auth: {
            persistSession: true,
        },
        global: {
            fetch: (url, options) => {
                return fetch(url, { ...options, cache: 'no-store' });
            }
        }
    }
);
