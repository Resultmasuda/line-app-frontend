"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Search, Filter } from 'lucide-react';
import { getAllUsers, AdminUserRecord } from '@/lib/api/admin';

export default function AdminStaffPage() {
    const [users, setUsers] = useState<AdminUserRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        async function fetchUsers() {
            setIsLoading(true);
            const res = await getAllUsers();
            if (res.success && res.data) {
                setUsers(res.data);
            }
            setIsLoading(false);
        }
        fetchUsers();
    }, []);

    const filteredUsers = users.filter(user =>
        user.display_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center max-w-5xl">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Users className="text-emerald-500" size={28} />
                        スタッフ一覧
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        LINE連携済みの全スタッフ {users.length} 名
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-w-5xl">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="スタッフ名を検索..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors bg-white">
                        <Filter size={16} />
                        絞り込み
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                <th className="px-6 py-4 font-semibold border-b border-gray-100">スタッフ名</th>
                                <th className="px-6 py-4 font-semibold border-b border-gray-100">ロール (権限)</th>
                                <th className="px-6 py-4 font-semibold border-b border-gray-100">ユーザーID</th>
                                <th className="px-6 py-4 font-semibold border-b border-gray-100 text-center">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                                        <div className="flex justify-center mb-2">
                                            <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
                                        </div>
                                        読み込み中...
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500 text-sm">
                                        該当するスタッフが見つかりません
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">
                                                    {user.display_name.slice(0, 2).toUpperCase()}
                                                </div>
                                                <span className="font-bold text-gray-800">{user.display_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${user.role === 'admin'
                                                ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                                : 'bg-gray-100 text-gray-600 border border-gray-200'
                                                }`}>
                                                {user.role === 'admin' ? '管理者' : 'スタッフ'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-mono text-gray-400 whitespace-nowrap">
                                            {user.id}
                                        </td>
                                        <td className="px-6 py-4 text-center whitespace-nowrap">
                                            <Link href={`/admin/staff/${user.id}`} className="text-emerald-600 font-bold text-[11px] sm:text-xs hover:text-emerald-700 transition-colors bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                                                詳細を見る
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
