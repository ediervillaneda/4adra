import { UserRepository } from '../../domain/user/UserRepository';
import { User } from '../../domain/user/User';
import { UserId } from '../../domain/user/UserId';
import { Email } from '../../domain/user/Email';
import { UserStatus } from '../../domain/user/UserStatus';
import { fromIsoDate, toIsoDate } from './isoDate';

interface UserRow {
  id: string;
  display_name: string;
  email: string;
  photo_url: string | null;
  preferred_currency: string;
  language: string;
  time_zone: string;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

function fromRow(row: UserRow): User {
  return User.create({
    id: UserId.fromString(row.id),
    displayName: row.display_name,
    email: Email.fromString(row.email),
    photoUrl: row.photo_url,
    preferredCurrency: row.preferred_currency,
    language: row.language,
    timeZone: row.time_zone,
    status: row.status,
    createdAt: fromIsoDate(row.created_at),
    updatedAt: fromIsoDate(row.updated_at),
  });
}

export class D1UserRepository implements UserRepository {
  constructor(private readonly database: D1Database) {}

  async findById(id: UserId): Promise<User | null> {
    const row = await this.database
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(id.toString())
      .first<UserRow>();
    return row === null ? null : fromRow(row);
  }

  async save(user: User): Promise<void> {
    await this.database
      .prepare(
        `INSERT INTO users (id, display_name, email, photo_url, preferred_currency, language, time_zone, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET
           display_name = excluded.display_name,
           email = excluded.email,
           photo_url = excluded.photo_url,
           preferred_currency = excluded.preferred_currency,
           language = excluded.language,
           time_zone = excluded.time_zone,
           status = excluded.status,
           updated_at = excluded.updated_at`,
      )
      .bind(
        user.id.toString(),
        user.displayName,
        user.email.toString(),
        user.photoUrl,
        user.preferredCurrency,
        user.language,
        user.timeZone,
        user.status,
        toIsoDate(user.createdAt),
        toIsoDate(user.updatedAt),
      )
      .run();
  }
}
