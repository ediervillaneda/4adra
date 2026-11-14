import { UserRepository } from '../../domain/user/UserRepository';
import { GetCurrentUserProfileCommand } from './GetCurrentUserProfileCommand';
import { UserProfileView } from './UserProfileView';
import { toUserProfileView } from './toUserProfileView';
import { ensureActiveUserProfile } from './ensureActiveUserProfile';

export class GetCurrentUserProfileUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly now: () => Date,
  ) {}

  async execute(command: GetCurrentUserProfileCommand): Promise<UserProfileView> {
    const profile = await ensureActiveUserProfile(this.userRepository, command.actor, this.now());
    return toUserProfileView(profile);
  }
}
