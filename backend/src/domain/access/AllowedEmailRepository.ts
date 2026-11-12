import { Email } from '../user/Email';

/** Lista de acceso a la plataforma: solo los correos vigentes pueden registrar una cuenta (ADR-018). */
export interface AllowedEmailRepository {
  isAllowed(email: Email): Promise<boolean>;
}
