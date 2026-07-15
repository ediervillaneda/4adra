import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { UserRepository } from '../../domain/user/UserRepository';
import { User } from '../../domain/user/User';
import { UserId } from '../../domain/user/UserId';
import { Email } from '../../domain/user/Email';
import { UserStatus } from '../../domain/user/UserStatus';

export interface UserDocument {
  displayName: string;
  email: string;
  photoUrl: string | null;
  preferredCurrency: string;
  language: string;
  timeZone: string;
  status: UserStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export function toFirestoreDocument(user: User): UserDocument {
  return {
    displayName: user.displayName,
    email: user.email.toString(),
    photoUrl: user.photoUrl,
    preferredCurrency: user.preferredCurrency,
    language: user.language,
    timeZone: user.timeZone,
    status: user.status,
    createdAt: Timestamp.fromDate(user.createdAt),
    updatedAt: Timestamp.fromDate(user.updatedAt),
  };
}

export function fromFirestoreDocument(id: string, data: UserDocument): User {
  return User.create({
    id: UserId.fromString(id),
    displayName: data.displayName,
    email: Email.fromString(data.email),
    photoUrl: data.photoUrl,
    preferredCurrency: data.preferredCurrency,
    language: data.language,
    timeZone: data.timeZone,
    status: data.status,
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
  });
}

const COLLECTION = 'users';

export class FirestoreUserRepository implements UserRepository {
  constructor(private readonly firestore: Firestore) {}

  async findById(id: UserId): Promise<User | null> {
    const snapshot = await this.firestore.collection(COLLECTION).doc(id.toString()).get();
    if (!snapshot.exists) {
      return null;
    }
    return fromFirestoreDocument(snapshot.id, snapshot.data() as UserDocument);
  }

  async save(user: User): Promise<void> {
    await this.firestore
      .collection(COLLECTION)
      .doc(user.id.toString())
      .set(toFirestoreDocument(user));
  }
}
