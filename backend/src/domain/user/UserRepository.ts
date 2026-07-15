import { User } from './User';
import { UserId } from './UserId';

export interface UserRepository {
  findById(id: UserId): Promise<User | null>;
  save(user: User): Promise<void>;
}
