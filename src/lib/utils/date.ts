/**
 * 日本標準時 (JST) を扱うためのユーティリティ
 */

/**
 * 現在のJST日付を 'YYYY-MM-DD' 形式の文字列で取得する
 */
export function getTodayJST(): string {
    const d = new Date();
    // 日本時間 (+9時間) に調整
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstDate = new Date(d.getTime() + jstOffset);
    return jstDate.toISOString().split('T')[0];
}

/**
 * 現在のJST年月を 'YYYY-MM' 形式の文字列で取得する
 */
export function getCurrentMonthJST(): string {
    const today = getTodayJST();
    return today.substring(0, 7);
}

/**
 * 指定した日付文字列 (YYYY-MM-DD) を JST の基準で Date オブジェクトに変換する
 * (時間のずれを防ぐため)
 */
export function parseJSTDate(dateStr: string): Date {
    return new Date(`${dateStr}T00:00:00+09:00`);
}

/**
 * Date オブジェクトを JST の 'YYYY-MM-DD' 形式に変換する
 */
export function formatToJSTDate(date: Date): string {
    return new Intl.DateTimeFormat('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Asia/Tokyo'
    }).format(date).replace(/\//g, '-');
}

/**
 * Date オブジェクトを JST の 'HH:mm' 形式に変換する
 */
export function formatToJSTTime(date: Date): string {
    return new Intl.DateTimeFormat('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Tokyo'
    }).format(date);
}
