/** Bytes aleatorios del código de un enlace: 128 bits, imposible de adivinar. */
const CODE_BYTES = 16;

/** Código aleatorio para la URL del enlace, en base64url sin relleno (22 caracteres). */
export function generateInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_BYTES));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Hash SHA-256 del código en hexadecimal: lo único que se guarda en D1. */
export async function hashInviteCode(code: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
