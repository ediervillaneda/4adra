const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Email {
  private constructor(private readonly value: string) {}

  static fromString(value: string): Email {
    const normalized = value.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalized)) {
      throw new Error(`Email inválido: ${value.trim()}`);
    }
    return new Email(normalized);
  }

  toString(): string {
    return this.value;
  }
}
