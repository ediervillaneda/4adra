export class GroupId {
  private constructor(private readonly value: string) {}

  static fromString(value: string): GroupId {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new Error('GroupId no puede estar vacío.');
    }
    return new GroupId(trimmed);
  }

  toString(): string {
    return this.value;
  }
}
