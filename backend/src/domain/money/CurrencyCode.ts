/** Monedas ISO-4217 admitidas por la plataforma (perfil de usuario y moneda base de grupo). */
export const SUPPORTED_CURRENCIES = ['COP', 'USD', 'EUR', 'MXN', 'GTQ'] as const;

export function isSupportedCurrency(value: unknown): value is string {
  return typeof value === 'string' && (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}
