import { UserRepository } from '../../domain/user/UserRepository';
import { User } from '../../domain/user/User';
import { GetCurrentUserProfileCommand } from './GetCurrentUserProfileCommand';
import { UserProfileView } from './UserProfileView';
import { toUserProfileView } from './toUserProfileView';
import { DEFAULT_PROFILE_SETTINGS } from './defaultProfileSettings';

export class GetCurrentUserProfileUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly now: () => Date,
  ) {}

  async execute(command: GetCurrentUserProfileCommand): Promise<UserProfileView> {
    const { actor } = command;
    const existing = await this.userRepository.findById(actor.userId);

    if (existing !== null) {
      existing.assertActive();
      return toUserProfileView(existing);
    }

    const timestamp = this.now();
    const created = User.create({
      id: actor.userId,
      displayName: actor.displayName ?? actor.email.toString(),
      email: actor.email,
      photoUrl: actor.photoUrl,
      preferredCurrency: DEFAULT_PROFILE_SETTINGS.preferredCurrency,
      language: DEFAULT_PROFILE_SETTINGS.language,
      timeZone: DEFAULT_PROFILE_SETTINGS.timeZone,
      status: 'ACTIVE',
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await this.userRepository.save(created);
    return toUserProfileView(created);
  }
}
