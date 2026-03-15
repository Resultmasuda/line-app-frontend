/**
 * ロール定義 (DB値 → 表示名)
 *   PRESIDENT = 社長
 *   EXECUTIVE = 幹部
 *   MANAGER   = 役職社員
 *   STAFF     = 社員
 *
 * ※ DB側の role カラムにこの値が入ります
 */
export const ROLE_OPTIONS = [
    { value: 'PRESIDENT', label: '社長' },
    { value: 'EXECUTIVE', label: '幹部' },
    { value: 'MANAGER', label: '役職社員' },
    { value: 'STAFF', label: '社員' },
] as const;

/**
 * ロールの表示順 (カレンダーリストのグループ分け等で使用)
 */
export const ROLE_GROUP_ORDER = ['PRESIDENT', 'EXECUTIVE', 'MANAGER', 'STAFF'] as const;

/**
 * ロールのグループ見出しラベル
 */
export const ROLE_GROUP_LABELS: Record<string, string> = {
    PRESIDENT: '社長',
    EXECUTIVE: '幹部',
    MANAGER: '役職社員',
    STAFF: '社員',
};

/**
 * スーパーアドミン — どのロールに設定されても管理画面にアクセスできるユーザー
 * (りょーた, 増田 涼太)
 */
export const SUPER_ADMIN_IDS = [
    'c42cb255-d3ad-41cb-9b48-e6ffcd2f6648', // りょーた
    '87e75b91-210c-41bb-9cc3-cc7850d473d4', // 増田 涼太
];

/**
 * STEALTH_ADMIN_IDS — 表示上は「役職者」スタイルに見せるが、内部的にはADMIN権限を持つユーザー
 * (後方互換のため維持)
 */
export const STEALTH_ADMIN_IDS = [
    'c42cb255-d3ad-41cb-9b48-e6ffcd2f6648', // りょーた
    '87e75b91-210c-41bb-9cc3-cc7850d473d4', // 増田 涼太
    '579596d6-5e9e-4162-8aa3-9ada8965348a', // 下田
    'deee093c-0097-447f-baa3-298e0804096f'  // SMD
];

/**
 * ユーザーが管理画面にアクセスできるかどうかを判定する
 */
export function isAdminUser(role: string, userId?: string): boolean {
    // スーパーアドミンは常にtrue
    if (userId && SUPER_ADMIN_IDS.includes(userId)) return true;
    const r = role.toUpperCase();
    return r === 'ADMIN' || r === 'PRESIDENT' || r === 'EXECUTIVE' || r === 'MANAGER';
}

/**
 * ユーザーのロールに応じた表示ラベルを返します
 */
export function getRoleDisplayLabel(role: string, userId?: string): string {
    const r = role.toUpperCase();
    return ROLE_GROUP_LABELS[r] || r;
}

/**
 * ユーザーのロールに応じたTailwind CSSクラスを返します
 */
export function getRoleBadgeClass(role: string, userId?: string): string {
    const r = role.toUpperCase();
    if (r === 'PRESIDENT') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (r === 'EXECUTIVE' || r === 'ADMIN') return 'bg-rose-50 text-rose-700 border-rose-200';
    if (r === 'MANAGER') return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-gray-50 text-gray-700 border-gray-200';
}
