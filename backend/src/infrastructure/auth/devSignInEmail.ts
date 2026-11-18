const LOCAL_HOSTNAMES = ['localhost', '127.0.0.1'];

/**
 * Correo con el que entra el login de desarrollo (`DEV_LOGIN_EMAIL` en `.dev.vars`), o `null` si
 * queda apagado. Solo se activa si además `BETTER_AUTH_URL` es `http://` en localhost: aunque la
 * variable llegara por error a producción (https://4adra.edier.me), el login sin Google no existe ahí.
 */
export function devSignInEmail(email: string | undefined, baseURL: string): string | null {
  const trimmed = (email ?? '').trim();
  if (trimmed === '') {
    return null;
  }
  let url: URL;
  try {
    url = new URL(baseURL);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' || !LOCAL_HOSTNAMES.includes(url.hostname)) {
    return null;
  }
  return trimmed;
}
