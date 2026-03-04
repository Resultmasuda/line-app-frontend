"use client";
import React, { createContext, useContext, useEffect, useState } from 'react';
import liff from '@line/liff';
import { supabase } from '@/lib/supabase';
import { joinStore } from '@/lib/api/admin';
import RegistrationScreen from '@/components/RegistrationScreen';

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

    const [showRegistration, setShowRegistration] = useState(false);
    const [regProfile, setRegProfile] = useState<{ userId: string, displayName: string } | null>(null);
    const [inviteStoreIdState, setInviteStoreIdState] = useState<string | null>(null);
    const [regError, setRegError] = useState<string | null>(null);

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
                                line_user_id: 'U408cf442303ae393c96a27c10a006950',
                                display_name: '増田 涼太 (PC開発用)',
                            },
                            { onConflict: 'line_user_id' }
                        )
                        .select()
                        .single();

                    if (sbError) {
                        console.error('Supabase mock user upsert error:', sbError);
                        // Continue with mock user even if upsert fails, to allow local development
                    }

                    if (isMounted) {
                        setUser(data ? (data as AppUser) : {
                            id: '00000000-0000-0000-0000-000000000000',
                            line_user_id: 'U408cf442303ae393c96a27c10a006950',
                            display_name: '増田 涼太 (PC開発)',
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
                    // ログイン後のリダイレクト先を現在のURL（管理画面等）にする
                    liff.login({ redirectUri: window.location.href });
                    return;
                }

                // LINEのユーザープロフィールを取得
                const profile = await liff.getProfile();

                // URLパラメータから情報を取得
                const urlParams = new URLSearchParams(window.location.search);
                const linkId = urlParams.get('link_id');
                const inviteStoreId = urlParams.get('invite_store_id');

                let userData;

                if (linkId) {
                    // 事前登録ユーザーとの連携処理
                    const { data: existingUser } = await supabase
                        .from('users')
                        .select('*')
                        .eq('id', linkId)
                        .single();

                    if (existingUser && !existingUser.line_user_id) {
                        const { data: updatedUser, error: updateError } = await supabase
                            .from('users')
                            .update({ line_user_id: profile.userId, display_name: profile.displayName })
                            .eq('id', linkId)
                            .select()
                            .single();

                        if (!updateError) {
                            userData = updatedUser;
                            // URLパラメータをクモ削除
                            const cleanUrl = window.location.origin + window.location.pathname;
                            window.history.replaceState({}, document.title, cleanUrl);
                            alert(`LINEアカウントを事前登録データ（${existingUser.display_name}）と連携しました！`);
                        }
                    }
                }

                if (!userData) {
                    // RPCを使用して RLS 無限ループを回避して検索 (v5対応)
                    const { data: matchedRecords } = await supabase
                        .rpc('find_user_by_line_id', { p_line_id: profile.userId });

                    const existingByLine = matchedRecords && matchedRecords.length > 0 ? matchedRecords[0] : null;

                    if (existingByLine) {
                        userData = existingByLine;
                    } else {
                        // LINE連携済みレコードがない → 新規登録画面へ
                        setRegProfile({ userId: profile.userId, displayName: profile.displayName || '' });
                        if (inviteStoreId) setInviteStoreIdState(inviteStoreId);

                        if (isMounted) {
                            setShowRegistration(true);
                            setLoading(false);
                        }
                        return;
                    }
                }

                if (isMounted && userData) {
                    setUser(userData as AppUser);

                    // 招待されている場合は店舗に紐付ける
                    if (inviteStoreId) {
                        try {
                            await joinStore(inviteStoreId, userData.id);
                            const cleanUrl = window.location.origin + window.location.pathname;
                            window.history.replaceState({}, document.title, cleanUrl);
                            alert('店舗への登録が完了しました！');
                        } catch (err) {
                            console.error('Failed to join store:', err);
                        }
                    }
                }

            } catch (err: unknown) {
                if (isMounted) {
                    console.error("LIFF initialization failed", err);
                    if (err instanceof Error) {
                        setError(err.message);
                    } else {
                        setError('Failed to initialize LIFF');
                    }
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        initLiff();

    }, []);

    const handleRegistration = async (phoneNumber: string, pinCode: string) => {
        setRegError(null);

        if (!regProfile) return;

        const cleanPhone = phoneNumber.trim().replace(/\s/g, '').replace(/-/g, '');

        try {
            // RPCを使用して RLS をバイパスし、ユーザーを検索する（無限ループ回避 + 表記揺れ吸収）
            const { data: matchedUsers, error: searchErr } = await supabase
                .rpc('find_unlinked_user_by_phone', { p_phone_number: cleanPhone });

            const matchedPreReg = matchedUsers && matchedUsers.length > 0 ? matchedUsers[0] : null;

            if (searchErr || !matchedPreReg) {
                setRegError('入力された電話番号のスタッフ登録が見つかりません。管理者に登録状況を確認してください。');
                return;
            }

            // 個別のPIN設定があればそれを使用、なければ全体パスワード
            const expectedPin = matchedPreReg.pin_code || process.env.NEXT_PUBLIC_REGISTRATION_PIN || '@Result2020';

            if (pinCode !== expectedPin) {
                setRegError('パスワードが間違っています。');
                return;
            }

            // LINEアカウントと紐付ける
            const { data: linkedUser, error: linkErr } = await supabase
                .from('users')
                .update({
                    line_user_id: regProfile.userId
                })
                .eq('id', matchedPreReg.id)
                .select()
                .single();

            if (linkErr) throw linkErr;

            alert(`認証成功！「${matchedPreReg.display_name}」さんと連携しました。`);

            setUser(linkedUser as AppUser);
            setShowRegistration(false);

            // 招待URLからの遷移だった場合は店舗に紐付ける
            if (inviteStoreIdState) {
                try {
                    await joinStore(inviteStoreIdState, linkedUser.id);
                    window.history.replaceState({}, document.title, window.location.pathname);
                    alert('店舗への登録が完了しました！');
                } catch (err) {
                    console.error('Failed to join store:', err);
                }
            }
        } catch (err) {
            console.error('Registration link error:', err);
            setRegError('連携処理中にエラーが発生しました。時間を置いて再度お試しください。');
        }
    };

    return (
        <LiffContext.Provider value={{ user, loading, error }}>
            {showRegistration && (
                <RegistrationScreen
                    onSubmit={handleRegistration}
                    error={regError}
                />
            )}
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
