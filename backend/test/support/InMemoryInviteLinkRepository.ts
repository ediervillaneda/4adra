import { InviteLink } from '../../src/domain/invitation/InviteLink';
import {
  CurrentInviteLink,
  InviteLinkRepository,
} from '../../src/domain/invitation/InviteLinkRepository';
import { InMemoryGroupRepository } from './InMemoryGroupRepository';

interface StoredInviteLink {
  link: InviteLink;
  replaced: boolean;
}

/** Como la D1 (que une `invite_links` con `groups`), toma el nombre del grupo del repositorio dado. */
export class InMemoryInviteLinkRepository implements InviteLinkRepository {
  readonly stored: StoredInviteLink[] = [];

  constructor(private readonly groups: InMemoryGroupRepository) {}

  replaceForGroup(link: InviteLink): Promise<void> {
    for (const entry of this.stored) {
      if (entry.link.groupId.toString() === link.groupId.toString()) {
        entry.replaced = true;
      }
    }
    this.stored.push({ link, replaced: false });
    return Promise.resolve();
  }

  findCurrentByCodeHash(codeHash: string): Promise<CurrentInviteLink | null> {
    const entry = this.stored.find(
      (candidate) => !candidate.replaced && candidate.link.codeHash === codeHash,
    );
    const group = entry === undefined ? null : this.groups.groupById(entry.link.groupId);
    if (entry === undefined || group?.status !== 'ACTIVE') {
      return Promise.resolve(null);
    }
    return Promise.resolve({ link: entry.link, groupName: group.name });
  }
}
