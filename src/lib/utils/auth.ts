/**
 * 特定のユーザー（増田様）の表示を「役職者」に上書きするためのIDリスト
 */
export const STEALTH_ADMIN_IDS = [
    'c42cb255-d3ad-41cb-9b48-e6ffcd2f6648', // りょーた
    '87e75b91-210c-41bb-9cc3-cc7850d473d4', // 増田　涼太
    '579596d6-5e9e-4162-8aa3-9ada8965348a', // 下田
    'deee093c-0097-447f-baa3-298e0804096f'  // SMD
];

/**
 * ユーザーのロールに応じた表示ラベルを返します
 * 増田様のアカウント（ADMIN）の場合は「役職者」を返します
 */
export function getRoleDisplayLabel(role: string, userId?: string): string {
    const r = role.toUpperCase();

    // 増田様のアカウント（ADMIN）は「役職者」と表示する
    if (userId && STEALTH_ADMIN_IDS.includes(userId)) {
        return '役職者';
    }

    if (r === 'ADMIN') return '社長・幹部';
    if (r === 'MANAGER') return '役職者';
    return '一般';
}

/**
 * ユーザーのロールに応じたTailwind CSSクラスを返します
 */
export function getRoleBadgeClass(role: string, userId?: string): string {
    const r = role.toUpperCase();

    // 増田様のアカウント（ADMIN）は役職者（琥珀色/青色）と同じスタイルにするか、
    // あるいはADMINのスタイルのままでラベルだけ変えるかは好みですが、
    // ここではラベルに合わせて「役職者」風のスタイル（MANAGERと同じ）に寄せます
    if (userId && STEALTH_ADMIN_IDS.includes(userId)) {
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }

    if (r === 'ADMIN') return 'bg-rose-50 text-rose-700 border-rose-200';
    if (r === 'MANAGER') return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-gray-50 text-gray-700 border-gray-200';
}
