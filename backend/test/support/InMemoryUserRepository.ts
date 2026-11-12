import { UserRepository } from '../../src/domain/user/UserRepository';
import { User } from '../../src/domain/user/User';
import { UserId } from '../../src/domain/user/UserId';

export class InMemoryUserRepository implements UserRepository {
  private readonly usersById = new Map<string, User>();
  saveCount = 0;

  seed(user: User): void {
    this.usersById.set(user.id.toString(), user);
  }

  findById(id: UserId): Promise<User | null> {
    return Promise.resolve(this.usersById.get(id.toString()) ?? null);
  }

  save(user: User): Promise<void> {
    this.saveCount += 1;
    this.usersById.set(user.id.toString(), user);
    return Promise.resolve();
  }
}
