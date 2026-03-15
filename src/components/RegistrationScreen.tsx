"use client";
import React, { useState } from 'react';
import { ShieldAlert, Loader2, Phone, Lock, Eye, EyeOff } from 'lucide-react';

interface RegistrationScreenProps {
    onSubmit: (phoneNumber: string, pinCode: string) => Promise<{ success: boolean, displayName?: string }>;
    onConfirm: () => Promise<void>;
    error?: string | null;
}

export default function RegistrationScreen({ onSubmit, onConfirm, error }: RegistrationScreenProps) {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [pinCode, setPinCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [confirmName, setConfirmName] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!phoneNumber.trim() || !pinCode.trim()) return;

        setIsSubmitting(true);
        const res = await onSubmit(phoneNumber.trim(), pinCode.trim());
        if (res.success && res.displayName) {
            setConfirmName(res.displayName);
        }
        setIsSubmitting(false);
    };

    const handleConfirm = async () => {
        setIsSubmitting(true);
        await onConfirm();
        setIsSubmitting(false);
    };

    return (
        <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 animate-in fade-in slide-in-from-bottom-8 duration-500">
                <div className="bg-emerald-600 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <ShieldAlert size={100} />
                    </div>
                    <div className="relative z-10 flex justify-center mb-4">
                        <div className="bg-white/20 p-4 rounded-full backdrop-blur-sm">
                            <ShieldAlert size={32} className="text-white" />
                        </div>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2 relative z-10">スタッフ認証</h2>
                    <p className="text-emerald-100 text-sm relative z-10">
                        {confirmName ? '本人確認をお願いします' : 'システムの利用を開始するには、\n設定されたパスワードを入力してください。'}
                    </p>
                </div>

                <div className="p-8">
                    {error && (
                        <div className="mb-6 bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl border border-red-100 flex items-start gap-2">
                            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                            <p>{error}</p>
                        </div>
                    )}

                    {confirmName ? (
                        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                            <div className="bg-emerald-50 p-6 rounded-2xl border-2 border-emerald-100 text-center">
                                <p className="text-xs font-bold text-emerald-600 mb-2 uppercase tracking-widest">対象スタッフ名</p>
                                <p className="text-2xl font-black text-gray-800 tracking-tight">{confirmName}</p>
                            </div>
                            
                            <p className="text-xs text-gray-500 font-medium leading-relaxed px-1">
                                上記のお名前でお間違いありませんか？<br />「認証」をクリックすると、現在のLINEアカウントと連携が完了します。
                            </p>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setConfirmName(null)}
                                    disabled={isSubmitting}
                                    className="flex-1 py-3.5 bg-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-200 transition-all active:scale-[0.98]"
                                >
                                    戻る
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirm}
                                    disabled={isSubmitting}
                                    className="flex-[2] py-3.5 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : '認証する'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 ml-1">電話番号</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                        <Phone size={18} />
                                    </div>
                                    <input
                                        type="tel"
                                        required
                                        placeholder="09012345678 (ハイフンなし)"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5 pt-2">
                                <label className="text-xs font-bold text-gray-500 ml-1">パスワード</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        placeholder="パスワードを入力"
                                        value={pinCode}
                                        onChange={(e) => setPinCode(e.target.value)}
                                        className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting || !phoneNumber || !pinCode}
                                className="w-full mt-8 py-3.5 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 hover:shadow-emerald-700/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        確認中...
                                    </>
                                ) : (
                                    'スタッフを検索'
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
