import { initializeApp, getApps, deleteApp, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { FirestoreUserRepository } from '../../src/infrastructure/firestore/FirestoreUserRepository';
import { User } from '../../src/domain/user/User';
import { UserId } from '../../src/domain/user/UserId';
import { Email } from '../../src/domain/user/Email';

let app: App;
let firestore: Firestore;

beforeAll(() => {
  app = getApps().length === 0 ? initializeApp({ projectId: 'demo-4adra' }) : getApps()[0]!;
  firestore = getFirestore(app);
});

afterAll(async () => {
  await deleteApp(app);
});

afterEach(async () => {
  const snapshot = await firestore.collection('users').get();
  await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
});

function aUser(id: string): User {
  const timestamp = new Date('2026-07-13T12:00:00Z');
  return User.create({
    id: UserId.fromString(id),
    displayName: 'Ana Pérez',
    email: Email.fromString('ana@example.com'),
    photoUrl: null,
    preferredCurrency: 'USD',
    language: 'es',
    timeZone: 'UTC',
    status: 'ACTIVE',
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

describe('FirestoreUserRepository (Firebase Emulator)', () => {
  it('shouldReturnNullWhenUserDoesNotExist', async () => {
    const repository = new FirestoreUserRepository(firestore);

    const result = await repository.findById(UserId.fromString('usr_no_existe'));

    expect(result).toBeNull();
  });

  it('shouldPersistAndRetrieveAUser', async () => {
    const repository = new FirestoreUserRepository(firestore);
    const user = aUser('usr_ana');

    await repository.save(user);
    const retrieved = await repository.findById(UserId.fromString('usr_ana'));

    expect(retrieved?.displayName).toBe('Ana Pérez');
    expect(retrieved?.email.toString()).toBe('ana@example.com');
    expect(retrieved?.createdAt.toISOString()).toBe('2026-07-13T12:00:00.000Z');
  });
});
