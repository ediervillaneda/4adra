/**
 * Convierte `TRUSTED_ORIGINS` (lista separada por comas) en los orígenes extra que Better Auth
 * acepta. Solo se usa en desarrollo (`ng serve` en http://localhost:4200); producción no la define.
 */
export function parseTrustedOrigins(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}
