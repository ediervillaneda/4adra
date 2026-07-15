import { UserId } from './UserId';
import { Email } from './Email';
import { UserStatus } from './UserStatus';
import { UserDisabledException } from './errors';

export interface UserProps {
  id: UserId;
  displayName: string;
  email: Email;
  photoUrl: string | null;
  preferredCurrency: string;
  language: string;
  timeZone: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  private constructor(private readonly props: UserProps) {}

  static create(props: UserProps): User {
    if (props.displayName.trim().length === 0) {
      throw new Error('displayName no puede estar vacío.');
    }
    return new User(props);
  }

  get id(): UserId {
    return this.props.id;
  }

  get displayName(): string {
    return this.props.displayName;
  }

  get email(): Email {
    return this.props.email;
  }

  get photoUrl(): string | null {
    return this.props.photoUrl;
  }

  get preferredCurrency(): string {
    return this.props.preferredCurrency;
  }

  get language(): string {
    return this.props.language;
  }

  get timeZone(): string {
    return this.props.timeZone;
  }

  get status(): UserStatus {
    return this.props.status;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  assertActive(): void {
    if (this.props.status === 'DISABLED') {
      throw new UserDisabledException(this.props.id.toString());
    }
  }
}
