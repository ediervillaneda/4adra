export class UserId {
  private constructor(private readonly value: string) {}

  static fromString(value: string): UserId {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new Error('UserId no puede estar vacío.');
    }
    return new UserId(trimmed);
  }

  toString(): string {
    return this.value;
  }

  equals(other: UserId): boolean {
    return this.value === other.value;
  }
}
