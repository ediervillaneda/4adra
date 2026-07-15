import { User } from '../../domain/user/User';
import { UserProfileView } from './UserProfileView';

export function toUserProfileView(user: User): UserProfileView {
  return {
    id: user.id.toString(),
    displayName: user.displayName,
    email: user.email.toString(),
    photoUrl: user.photoUrl,
    preferredCurrency: user.preferredCurrency,
    language: user.language,
    timeZone: user.timeZone,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
