/**
 * Credencial de sesión opaca (el encabezado `Cookie` crudo). El dominio no la interpreta:
 * solo el adaptador de autenticación sabe leerla, así el dominio no conoce HTTP.
 */
export class SessionCredential {
  private constructor(private readonly value: string) {}

  static fromCookieHeader(value: string | null | undefined): SessionCredential {
    return new SessionCredential((value ?? '').trim());
  }

  isEmpty(): boolean {
    return this.value.length === 0;
  }

  toString(): string {
    return this.value;
  }
}
