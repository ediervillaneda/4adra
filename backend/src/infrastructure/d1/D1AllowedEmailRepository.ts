import { AllowedEmailRepository } from '../../domain/access/AllowedEmailRepository';
import { Email } from '../../domain/user/Email';

export class D1AllowedEmailRepository implements AllowedEmailRepository {
  constructor(private readonly database: D1Database) {}

  async isAllowed(email: Email): Promise<boolean> {
    const row = await this.database
      .prepare('SELECT 1 AS allowed FROM allowed_emails WHERE email = ? AND revoked_at IS NULL')
      .bind(email.toString())
      .first<{ allowed: number }>();
    return row !== null;
  }
}
