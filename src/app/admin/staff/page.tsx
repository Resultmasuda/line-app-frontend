"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Search, Filter, Plus, Link as LinkIcon, Edit2, Unlink } from 'lucide-react';
import { getAllUsers, AdminUserRecord, createPreRegisteredUser, updateUserRole, updateUserPhoneNumber, unlinkUserLineId } from '@/lib/api/admin';
import { getRoleDisplayLabel, getRoleBadgeClass, ROLE_OPTIONS, isAdminUser } from '@/lib/utils/auth';

export default function AdminStaffPage() {
    const [users, setUsers] = useState<AdminUserRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [showAddModal, setShowAddModal] = useState(false);
    const [newUserName, setNewUserName] = useState('');
    const [newPhoneNumber, setNewPhoneNumber] = useState('');
    const [newUserRole, setNewUserRole] = useState('STAFF');
    const [isCreating, setIsCreating] = useState(false);

    const ROLE_LABELS: Record<string, string> = {
        'ADMIN': '社長・幹部',
        'MANAGER': '役職者',
        'STAFF': '一般'
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

    const filteredUsers = users.filter(user =>
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
        const res = await updateUserRole(userId, newRole);
        if (res.success) {
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } else {
            alert('権限の更新に失敗しました');
        }
    };

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
                        <button className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors bg-white whitespace-nowrap">
                            <Filter size={16} />
                            絞り込み
                        </button>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm whitespace-nowrap"
                        >
                            <Plus size={16} />
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
                                            <select
                                                value={user.role.toUpperCase()}
                                                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer ${user.role.toUpperCase() === 'PRESIDENT' ? 'bg-amber-50 text-amber-700 border-amber-200' :
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
                                                        <span className="text-emerald-600 font-medium px-2 py-0.5 bg-emerald-50 rounded-md inline-block w-fit text-[10px]">連携済み</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-amber-600 font-bold px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-md inline-block w-fit text-[10px]">未連携</span>
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

            {/* スタッフ追加モーダル */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <span className="bg-emerald-100 text-emerald-600 p-1.5 rounded-xl"><Users size={18} /></span>
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
