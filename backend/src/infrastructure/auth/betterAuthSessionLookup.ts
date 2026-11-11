import { Auth } from './createAuth';
import { SessionLookup } from './BetterAuthAuthenticationProvider';

/** Consulta la sesión en Better Auth conservando los `Set-Cookie` de renovación. */
export function betterAuthSessionLookup(auth: Auth): SessionLookup {
  return async (headers) => {
    const result = await auth.api.getSession({ headers, returnHeaders: true });
    return { session: result.response, setCookies: result.headers.getSetCookie() };
  };
}
