/** Fechas de dominio en D1: TEXT ISO-8601 UTC con milisegundos (docs/DatabaseSchema.md). */
export function toIsoDate(date: Date): string {
  return date.toISOString();
}

export function fromIsoDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Fecha ISO-8601 inválida en D1: ${value}`);
  }
  return date;
}
