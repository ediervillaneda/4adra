/** Valores con los que nace un perfil; el usuario los cambia con PATCH /api/v1/me. */
export const DEFAULT_PROFILE_SETTINGS = {
  preferredCurrency: 'COP',
  language: 'es',
  timeZone: 'America/Bogota',
} as const;
