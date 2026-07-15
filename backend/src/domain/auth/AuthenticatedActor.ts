import { UserId } from '../user/UserId';
import { Email } from '../user/Email';

export interface AuthenticatedActor {
  readonly userId: UserId;
  readonly email: Email;
  readonly displayName: string | null;
  readonly photoUrl: string | null;
}
