/**
 * La ruta, solo si al resolverla queda en este mismo origen ("/unirse/…"); si no, `null`.
 * Se resuelve con el parser de URL del navegador, como lo hará la redirección: así "//otro-sitio",
 * "/\otro-sitio" o "/<tab>/otro-sitio" (que el parser convierte en otro host) se rechazan.
 * Evita redirecciones abiertas con `?volver=`.
 */
export function toInternalPath(path: string | null, origin: string): string | null {
  if (path?.startsWith('/') !== true) {
    return null;
  }
  const url = new URL(path, origin);
  return url.origin === origin ? `${url.pathname}${url.search}${url.hash}` : null;
}
