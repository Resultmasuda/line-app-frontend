"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Search, Plus, Link as LinkIcon } from 'lucide-react';
import { getAllUsers, AdminUserRecord, createPreRegisteredUser, updateUserRole } from '@/lib/api/admin';
import { ROLE_OPTIONS } from '@/lib/utils/auth';

export default function AdminStaffPage() {
    const [users, setUsers] = useState<AdminUserRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [showAddModal, setShowAddModal] = useState(false);
    const [newUserName, setNewUserName] = useState('');
    const [newPhoneNumber, setNewPhoneNumber] = useState('');
    const [newUserRole, setNewUserRole] = useState('STAFF');
    const [isCreating, setIsCreating] = useState(false);
    const [isUpdatingRole, setIsUpdatingRole] = useState(false);

    const ROLE_PRIORITY: Record<string, number> = {
        'PRESIDENT': 0,
        'EXECUTIVE': 1,
        'MANAGER': 2,
        'STAFF': 3
    };

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

    const sortedUsers = [...users].sort((a, b) => {
        const priorityA = ROLE_PRIORITY[a.role.toUpperCase()] ?? 99;
        const priorityB = ROLE_PRIORITY[b.role.toUpperCase()] ?? 99;
        if (priorityA !== priorityB) return priorityA - priorityB;
        return a.display_name.localeCompare(b.display_name, 'ja');
    });

    const filteredUsers = sortedUsers.filter(user =>
        user.display_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCreateStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUserName.trim() || !newPhoneNumber.trim()) return;
        setIsCreating(true);
        const res = await createPreRegisteredUser(newUserName.trim(), newUserRole, newPhoneNumber.trim());
        if (res.success && res.data) {
            setUsers([...users, res.data]);
            setShowAddModal(false);
            setNewUserName('');
            setNewPhoneNumber('');
            setNewUserRole('STAFF');
            alert('スタッフを事前登録しました。リストのリンクアイコンから専用連携URLを取得してください。');
        } else {
            alert('スタッフの登録に失敗しました');
        }
        setIsCreating(false);
    };

    const handleRoleChange = async (userId: string, newRole: string) => {
        // Allow role changes for all users including super admins

        setIsUpdatingRole(true);
        const res = await updateUserRole(userId, newRole);
        if (res.success) {
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } else {
            alert('権限の更新に失敗しました');
        }
        setIsUpdatingRole(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center max-w-5xl">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3 tracking-tighter">
                        <div className="p-2 bg-brand-blue/10 text-brand-blue rounded-xl shadow-inner">
                            <Users size={28} strokeWidth={2.5} />
                        </div>
                        スタッフ一覧
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        LINE連携済みの全スタッフ {users.length} 名
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-w-5xl">
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center bg-gray-50/50 gap-4">
                    <div className="relative w-full sm:w-72 flex-shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="スタッフ名を検索..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                        />
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black text-white bg-brand-blue hover:bg-brand-deep-blue transition-all shadow-lg shadow-brand-blue/20 uppercase tracking-widest active:scale-95"
                        >
                            <Plus size={16} strokeWidth={3} />
                            スタッフを追加
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                <th className="px-6 py-4 font-semibold border-b border-gray-100">スタッフ名</th>
                                <th className="px-6 py-4 font-semibold border-b border-gray-100">ロール (権限)</th>
                                <th className="px-6 py-4 font-semibold border-b border-gray-100">電話番号 / LINE連携</th>
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
                                filteredUsers.map((user) => {
                                    const isSuperAdmin = ['c42cb255-d3ad-41cb-9b48-e6ffcd2f6648', '87e75b91-210c-41bb-9cc3-cc7850d473d4'].includes(user.id);
                                    return (
                                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center font-black text-sm shadow-inner group-hover/row:scale-110 transition-transform">
                                                        {user.display_name.slice(0, 1).toUpperCase()}
                                                    </div>
                                                    <span className="font-bold text-gray-800">{user.display_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <select
                                                    value={user.role.toUpperCase()}
                                                    disabled={isUpdatingRole}
                                                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed ${user.role.toUpperCase() === 'PRESIDENT' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                        user.role.toUpperCase() === 'EXECUTIVE' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                            user.role.toUpperCase() === 'MANAGER' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                                'bg-gray-50 text-gray-700 border-gray-200'
                                                        }`}
                                                >
                                                    {ROLE_OPTIONS.map(opt => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 text-xs whitespace-nowrap">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-2 group">
                                                        <span className="font-medium text-gray-700">{user.phone_number || '未登録'}</span>
                                                    </div>
                                                    {user.line_user_id ? (
                                                        <div className="flex items-center gap-2 group">
                                                            <span className="text-brand-blue font-black px-2 py-0.5 bg-brand-blue/5 rounded-md inline-block w-fit text-[10px] border border-brand-blue/10 whitespace-nowrap">連携済み</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-brand-gold font-black px-2 py-0.5 bg-brand-gold/5 border border-brand-gold/20 rounded-md inline-block w-fit text-[10px] whitespace-nowrap">未連携</span>
                                                            <button
                                                                onClick={() => {
                                                                    const url = `${window.location.origin}/?link_id=${user.id}`;
                                                                    navigator.clipboard.writeText(url);
                                                                    alert(`連携用URLをコピーしました！スタッフに送信してください。\n${url}`);
                                                                }}
                                                                className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-blue-600 transition-colors"
                                                                title="連携URLをコピー"
                                                            >
                                                                <LinkIcon size={14} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                <Link href={`/admin/staff/${user.id}`} className="text-brand-blue font-black text-[11px] sm:text-xs hover:text-brand-deep-blue transition-all bg-brand-blue/5 px-4 py-2 rounded-xl border border-brand-blue/10 hover:shadow-md active:scale-95">
                                                    詳細を見る
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* スタッフ追加モーダル */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-3 tracking-tight">
                                <span className="p-2 bg-brand-blue/10 text-brand-blue rounded-xl shadow-inner"><Users size={18} strokeWidth={2.5} /></span>
                                新規スタッフの事前登録
                            </h3>
                            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                                LINE連携前にスタッフ枠を作成します。<br />
                                作成後に発行される専用URLを本人に送ることで、本人アカウントと紐付けることができます。
                            </p>
                            <form onSubmit={handleCreateStaff} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">氏名 (表示用)</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="山田 太郎"
                                        value={newUserName}
                                        onChange={(e) => setNewUserName(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">電話番号 (ログイン認証用)</label>
                                    <input
                                        type="tel"
                                        required
                                        placeholder="09012345678 (ハイフンなし)"
                                        value={newPhoneNumber}
                                        onChange={(e) => setNewPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                    />
                                    <p className="text-[10px] text-gray-500 mt-1">※本人が初回ログイン時に入力する番号です。</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">初期役職</label>
                                    <select
                                        value={newUserRole}
                                        onChange={(e) => setNewUserRole(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                    >
                                        {ROLE_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex gap-2 pt-4 mt-2 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="flex-1 py-2 bg-gray-50 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-colors text-sm"
                                    >
                                        キャンセル
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isCreating}
                                        className="flex-1 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors text-sm disabled:opacity-50"
                                    >
                                        {isCreating ? '作成中...' : '登録する'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
