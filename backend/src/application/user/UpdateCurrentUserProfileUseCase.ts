import { UserRepository } from '../../domain/user/UserRepository';
import { validateProfileChanges } from '../../domain/user/ProfileChanges';
import { UpdateCurrentUserProfileCommand } from './UpdateCurrentUserProfileCommand';
import { UserProfileView } from './UserProfileView';
import { toUserProfileView } from './toUserProfileView';
import { createUserFromActor } from './createUserFromActor';

export class UpdateCurrentUserProfileUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly now: () => Date,
  ) {}

  async execute(command: UpdateCurrentUserProfileCommand): Promise<UserProfileView> {
    const changes = validateProfileChanges(command.changes);
    const now = this.now();
    const current =
      (await this.userRepository.findById(command.actor.userId)) ??
      createUserFromActor(command.actor, now);
    current.assertActive();

    const updated = current.updateProfile(changes, now);
    await this.userRepository.save(updated);
    return toUserProfileView(updated);
  }
}
