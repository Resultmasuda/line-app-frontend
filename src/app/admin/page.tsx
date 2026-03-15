"use client";
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminPage() {
    useEffect(() => {
        redirect('/admin/dashboard');
    }, []);

    return (
        <div className="flex h-screen bg-gray-50 items-center justify-center">
            <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin mb-4"></div>
                <p className="text-emerald-600 font-bold text-sm">ダッシュボードに移動中...</p>
            </div>
        </div>
    );
}
