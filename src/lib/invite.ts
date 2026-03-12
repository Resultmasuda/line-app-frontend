const DEFAULT_INVITE_TTL_MINUTES = 30;
const USED_INVITE_NONCES_KEY = 'used-invite-nonces';

type InviteValidationResult = {
  isValid: boolean;
  reason?: string;
  inviteStoreId?: string;
  inviteNonce?: string;
};

function resolveTtlMinutes() {
  const raw = process.env.NEXT_PUBLIC_INVITE_LINK_TTL_MINUTES;
  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_INVITE_TTL_MINUTES;
  }

  return Math.floor(parsed);
}

function buildQuery(params: Record<string, string>) {
  return new URLSearchParams(params).toString();
}

export function buildInviteStoreLink(baseUrl: string, storeId: string) {
  const now = Date.now();
  const expiresAt = now + resolveTtlMinutes() * 60 * 1000;
  const nonce = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${now}-${Math.random().toString(36).slice(2)}`;

  const query = buildQuery({
    invite_store_id: storeId,
    invite_expires_at: String(expiresAt),
    invite_nonce: nonce,
  });

  return `${baseUrl}/?${query}`;
}

export function validateInviteFromParams(urlParams: URLSearchParams): InviteValidationResult {
  const inviteStoreId = urlParams.get('invite_store_id');

  if (!inviteStoreId) {
    return { isValid: false, reason: '招待リンクの店舗情報が見つかりません。' };
  }

  const expiresAtRaw = urlParams.get('invite_expires_at');
  const inviteNonce = urlParams.get('invite_nonce');

  if (!expiresAtRaw || !inviteNonce) {
    return { isValid: false, reason: 'この招待リンクは旧形式か無効です。管理者に再発行を依頼してください。' };
  }

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt)) {
    return { isValid: false, reason: '招待リンクの有効期限情報が不正です。' };
  }

  if (Date.now() > expiresAt) {
    return { isValid: false, reason: '招待リンクの有効期限が切れています。管理者に再発行を依頼してください。' };
  }

  if (typeof window !== 'undefined') {
    const usedNoncesRaw = window.sessionStorage.getItem(USED_INVITE_NONCES_KEY);
    const usedNonces = usedNoncesRaw ? JSON.parse(usedNoncesRaw) as string[] : [];

    if (usedNonces.includes(inviteNonce)) {
      return { isValid: false, reason: 'この招待リンクは既に利用済みです。' };
    }
  }

  return { isValid: true, inviteStoreId, inviteNonce };
}

export function consumeInviteNonce(inviteNonce: string) {
  if (typeof window === 'undefined') return;

  const usedNoncesRaw = window.sessionStorage.getItem(USED_INVITE_NONCES_KEY);
  const usedNonces = usedNoncesRaw ? JSON.parse(usedNoncesRaw) as string[] : [];

  if (!usedNonces.includes(inviteNonce)) {
    usedNonces.push(inviteNonce);
    window.sessionStorage.setItem(USED_INVITE_NONCES_KEY, JSON.stringify(usedNonces));
  }
}

export function getInviteTtlMinutes() {
  return resolveTtlMinutes();
}
