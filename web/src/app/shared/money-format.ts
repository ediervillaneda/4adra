/** Formato de montos y fechas de gastos para mostrar. Nunca se hacen cuentas aquí: el backend calcula. */

const LOCALE = 'es-CO';
const DECIMALS_BY_CURRENCY: Readonly<Record<string, number>> = { COP: 0 };

/** "150000" COP → "$ 150.000"; "33.34" USD → "US$ 33,34". Formatea el texto decimal tal cual, sin float. */
export function formatMoney(amount: string, currency: string): string {
  const decimals = DECIMALS_BY_CURRENCY[currency] ?? 2;
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    // Intl.NumberFormat v3 (ES2023) acepta el decimal como texto y lo formatea exacto; los tipos
    // de TypeScript todavía solo declaran number | bigint.
  }).format(amount as unknown as number);
}

/** El día del gasto (guardado a las 00:00 Z) en UTC, para que no cambie con la zona horaria: "17 nov 2026". */
export function formatExpenseDate(isoDate: string): string {
  // Por partes: cada motor arma distinto el texto completo ("17 de nov de 2026", "17 nov. 2026").
  const parts = new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).formatToParts(new Date(isoDate));
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((candidate) => candidate.type === type)?.value.replace('.', '') ?? '';
  return `${part('day')} ${part('month')} ${part('year')}`;
}
