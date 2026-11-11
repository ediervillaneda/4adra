import { env } from 'cloudflare:test';

/** Inserta una identidad mínima de Better Auth para satisfacer la FK de `users`. */
export async function seedAuthUser(id: string, email: string): Promise<void> {
  const now = '2026-07-13T12:00:00.000Z';
  await env.DB.prepare(
    'INSERT INTO "user" (id, name, email, emailVerified, image, createdAt, updatedAt) VALUES (?, ?, ?, 1, NULL, ?, ?)',
  )
    .bind(id, 'Ana Pérez', email, now, now)
    .run();
}
