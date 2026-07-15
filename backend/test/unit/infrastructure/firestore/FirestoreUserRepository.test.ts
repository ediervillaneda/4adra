import { Timestamp } from 'firebase-admin/firestore';
import {
  FirestoreUserRepository,
  toFirestoreDocument,
  fromFirestoreDocument,
} from '../../../../src/infrastructure/firestore/FirestoreUserRepository';
import { User } from '../../../../src/domain/user/User';
import { UserId } from '../../../../src/domain/user/UserId';
import { Email } from '../../../../src/domain/user/Email';

function aUser(): User {
  const timestamp = new Date('2026-07-13T12:00:00Z');
  return User.create({
    id: UserId.fromString('usr_ana'),
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

describe('toFirestoreDocument / fromFirestoreDocument', () => {
  it('shouldRoundTripAUserThroughFirestoreDocumentShape', () => {
    const user = aUser();
    const document = toFirestoreDocument(user);
    const restored = fromFirestoreDocument('usr_ana', document);

    expect(restored.id.toString()).toBe('usr_ana');
    expect(restored.displayName).toBe('Ana Pérez');
    expect(restored.email.toString()).toBe('ana@example.com');
    expect(restored.status).toBe('ACTIVE');
    expect(restored.createdAt.toISOString()).toBe('2026-07-13T12:00:00.000Z');
  });
});

describe('FirestoreUserRepository', () => {
  function firestoreStub(): { firestore: never; doc: { get: jest.Mock; set: jest.Mock } } {
    const doc = { get: jest.fn(), set: jest.fn() };
    const collection = jest.fn().mockReturnValue({ doc: jest.fn().mockReturnValue(doc) });
    return { firestore: { collection } as never, doc };
  }

  it('shouldReturnNullWhenDocumentDoesNotExist', async () => {
    const { firestore, doc } = firestoreStub();
    doc.get.mockResolvedValue({ exists: false });
    const repository = new FirestoreUserRepository(firestore);

    const result = await repository.findById(UserId.fromString('usr_ana'));

    expect(result).toBeNull();
  });

  it('shouldMapExistingDocumentToUser', async () => {
    const { firestore, doc } = firestoreStub();
    const timestamp = Timestamp.fromDate(new Date('2026-07-13T12:00:00Z'));
    doc.get.mockResolvedValue({
      exists: true,
      id: 'usr_ana',
      data: () => ({
        displayName: 'Ana Pérez',
        email: 'ana@example.com',
        photoUrl: null,
        preferredCurrency: 'USD',
        language: 'es',
        timeZone: 'UTC',
        status: 'ACTIVE',
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
    });
    const repository = new FirestoreUserRepository(firestore);

    const result = await repository.findById(UserId.fromString('usr_ana'));

    expect(result?.displayName).toBe('Ana Pérez');
  });

  it('shouldWriteDocumentOnSave', async () => {
    const { firestore, doc } = firestoreStub();
    doc.set.mockResolvedValue(undefined);
    const repository = new FirestoreUserRepository(firestore);

    await repository.save(aUser());

    expect(doc.set).toHaveBeenCalledTimes(1);
    expect(doc.set).toHaveBeenCalledWith(expect.objectContaining({ displayName: 'Ana Pérez' }));
  });
});
