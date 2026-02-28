"use client";
import React, { createContext, useContext, useEffect, useState } from 'react';
import liff from '@line/liff';
import { supabase } from '@/lib/supabase';

// ユーザーデータの型定義
type AppUser = {
    id: string;
    line_user_id: string;
    display_name: string;
    role: string;
};

type LiffContextType = {
    user: AppUser | null;
    loading: boolean;
    error: string | null;
};

const LiffContext = createContext<LiffContextType>({
    user: null,
    loading: true,
    error: null,
});

export const useLiff = () => useContext(LiffContext);

export default function LiffProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const initLiff = async () => {
            try {
                const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
                if (!liffId) {
                    // LIFF ID 未設定時（ローカル開発用モック）
                    console.warn('LIFF ID is not defined. Using mock user.');

                    // Supabaseにモックユーザーを登録してIDを取得 (FK制約エラー回避のため)
                    const { data, error: sbError } = await supabase
                        .from('users')
                        .upsert(
                            {
                                line_user_id: 'mock_line_user_12345',
                                display_name: 'テスト太郎 (開発用)',
                            },
                            { onConflict: 'line_user_id' }
                        )
                        .select()
                        .single();

                    if (isMounted) {
                        setUser(data ? (data as AppUser) : {
                            id: '00000000-0000-0000-0000-000000000000',
                            line_user_id: 'mock_line_user_12345',
                            display_name: 'テスト太郎 (モック)',
                            role: 'MANAGER',
                        });
                        setLoading(false);
                    }
                    return;
                }

                // LIFFの初期化
                await liff.init({ liffId });

                // もしブラウザでLINEログインされていなかったらログイン画面へ
                if (!liff.isLoggedIn()) {
                    liff.login();
                    return;
                }

                // LINEのユーザープロフィールを取得
                const profile = await liff.getProfile();

                // データベース(Supabase)にユーザー情報を登録 or 取得する (Upsert)
                const { data, error: sbError } = await supabase
                    .from('users')
                    .upsert(
                        {
                            line_user_id: profile.userId,
                            display_name: profile.displayName,
                            // roleはデフォルトで 'STAFF' となる (schema.sqlで定義済み)
                        },
                        { onConflict: 'line_user_id' }
                    )
                    .select()
                    .single();

                if (sbError) {
                    throw sbError;
                }

                if (isMounted && data) {
                    setUser(data as AppUser);
                }

            } catch (err: any) {
                if (isMounted) {
                    console.error("LIFF initialization failed", err);
                    setError(err.message || 'Failed to initialize LIFF');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        initLiff();

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <LiffContext.Provider value={{ user, loading, error }}>
            {/* 開発時のプレビュー用に、loading中やエラー時も画面は見れるように一旦 children をそのまま返す */}
            {/* 実際の運用では loading 中はスピナーを出すのが一般的です */}
            {loading ? (
                <div className="flex items-center justify-center min-h-[50vh]">
                    <div className="animate-pulse flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin mb-4"></div>
                        <p className="text-emerald-500 font-bold text-sm">LINEと連携中...</p>
                    </div>
                </div>
            ) : error ? (
                <div className="p-5">
                    <div className="bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-xl text-sm font-medium">
                        エラーが発生しました: {error}
                        <p className="mt-2 text-xs text-rose-400">※ローカル環境 (localhost) でLIFFの動作テストを行う場合は、LIFF IDの発行とエンドポイントURLの設定が必要です。</p>
                    </div>
                    <div className="mt-4 opacity-50 pointer-events-none">
                        {children}
                    </div>
                </div>
            ) : (
                children
            )}
        </LiffContext.Provider>
    );
}
