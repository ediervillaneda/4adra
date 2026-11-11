import { UserRepository } from '../../domain/user/UserRepository';
import { GetCurrentUserProfileCommand } from './GetCurrentUserProfileCommand';
import { UserProfileView } from './UserProfileView';
import { toUserProfileView } from './toUserProfileView';
import { createUserFromActor } from './createUserFromActor';

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

    const created = createUserFromActor(actor, this.now());
    await this.userRepository.save(created);
    return toUserProfileView(created);
  }
}
