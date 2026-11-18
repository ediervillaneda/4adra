export class ExpenseId {
  private constructor(private readonly value: string) {}

  static fromString(value: string): ExpenseId {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new Error('ExpenseId no puede estar vacío.');
    }
    return new ExpenseId(trimmed);
  }

  toString(): string {
    return this.value;
  }
}
