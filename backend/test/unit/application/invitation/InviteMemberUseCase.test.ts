import { describe, it, expect, vi } from 'vitest';
import { InviteMemberUseCase } from '../../../../src/application/invitation/InviteMemberUseCase';
import { AllowedEmailRepository } from '../../../../src/domain/access/AllowedEmailRepository';
import { AuthenticatedActor } from '../../../../src/domain/auth/AuthenticatedActor';
import {
  GroupNotFoundException,
  PermissionDeniedException,
} from '../../../../src/domain/group/errors';
import { Group } from '../../../../src/domain/group/Group';
import { GroupId } from '../../../../src/domain/group/GroupId';
import { MemberRole } from '../../../../src/domain/group/MemberRole';
import {
  EmailNotAllowedException,
  MemberAlreadyActiveException,
} from '../../../../src/domain/invitation/errors';
import { Email } from '../../../../src/domain/user/Email';
import { User } from '../../../../src/domain/user/User';
import { UserId } from '../../../../src/domain/user/UserId';
import { InMemoryGroupRepository } from '../../../support/InMemoryGroupRepository';
import { InMemoryInvitationRepository } from '../../../support/InMemoryInvitationRepository';
import { InMemoryUserRepository } from '../../../support/InMemoryUserRepository';

const CREATED = new Date('2026-11-12T15:00:00.000Z');
const actor: AuthenticatedActor = {
  userId: UserId.fromString('usr_ana'),
  email: Email.fromString('ana@example.com'),
  displayName: 'Ana',
  photoUrl: null,
};

interface Scenario {
  useCase: InviteMemberUseCase;
  invitations: InMemoryInvitationRepository;
  isAllowed: ReturnType<typeof vi.fn>;
  setNow: (date: Date) => void;
}

/** Un miembro activo más, con su perfil (y su correo) guardado. */
function seedActiveMember(
  users: InMemoryUserRepository,
  groups: InMemoryGroupRepository,
  casa: Group,
  email: string,
): void {
  users.seed(
    User.create({
      id: UserId.fromString('usr_eva'),
      displayName: 'Eva',
      email: Email.fromString(email),
      photoUrl: null,
      preferredCurrency: 'COP',
      language: 'es',
      timeZone: 'America/Bogota',
      status: 'ACTIVE',
      createdAt: CREATED,
      updatedAt: CREATED,
    }),
  );
  groups.seedMembership(casa, {
    groupId: 'grp_casa',
    userId: 'usr_eva',
    role: 'MEMBER',
    status: 'ACTIVE',
  });
}

function scenario(actorRole: MemberRole, activeMemberEmail?: string): Scenario {
  const users = new InMemoryUserRepository();
  const groups = new InMemoryGroupRepository(users);
  const casa = Group.create(
    GroupId.fromString('grp_casa'),
    { name: 'Casa', description: null, defaultCurrency: 'COP' },
    UserId.fromString('usr_ana'),
    CREATED,
  );
  groups.seedMembership(casa, {
    groupId: 'grp_casa',
    userId: 'usr_ana',
    role: actorRole,
    status: 'ACTIVE',
  });
  if (activeMemberEmail !== undefined) {
    seedActiveMember(users, groups, casa, activeMemberEmail);
  }
  const invitations = new InMemoryInvitationRepository();
  const isAllowed = vi.fn().mockResolvedValue(true);
  const allowedEmails: AllowedEmailRepository = { isAllowed };
  let now = CREATED;
  let sequence = 0;
  const useCase = new InviteMemberUseCase(
    groups,
    allowedEmails,
    invitations,
    () => `inv_${String((sequence += 1))}`,
    () => now,
  );
  return {
    useCase,
    invitations,
    isAllowed,
    setNow: (date): void => {
      now = date;
    },
  };
}

const juan = { email: 'juan@example.com', role: 'MEMBER' };

describe('InviteMemberUseCase', () => {
  it('shouldCreateInvitationExpiringSevenDaysAfterNow', async () => {
    const { useCase } = scenario('OWNER');

    const view = await useCase.execute({ actor, groupId: 'grp_casa', input: juan });

    expect(view).toEqual({
      invitationId: 'inv_1',
      groupId: 'grp_casa',
      email: 'juan@example.com',
      role: 'MEMBER',
      status: 'PENDING',
      expiresAt: '2026-11-19T15:00:00.000Z',
    });
  });

  it('shouldCreateNewInvitationWhenPendingOneExpired', async () => {
    const { useCase, invitations, setNow } = scenario('ADMINISTRATOR');
    await useCase.execute({ actor, groupId: 'grp_casa', input: juan });

    setNow(new Date('2026-11-19T15:00:00.000Z'));
    const view = await useCase.execute({ actor, groupId: 'grp_casa', input: juan });

    expect(view.invitationId).toBe('inv_2');
    expect(view.expiresAt).toBe('2026-11-26T15:00:00.000Z');
    expect(invitations.invitations).toHaveLength(2);
  });

  it('shouldRejectBeforeCheckingAccessListWhenRoleCannotInvite', async () => {
    const { useCase, invitations, isAllowed } = scenario('READ_ONLY');

    await expect(
      useCase.execute({ actor, groupId: 'grp_casa', input: juan }),
    ).rejects.toBeInstanceOf(PermissionDeniedException);
    expect(isAllowed).not.toHaveBeenCalled();
    expect(invitations.invitations).toEqual([]);
  });

  it('shouldThrowGroupNotFoundWhenActorIsNotMember', async () => {
    const { useCase, invitations } = scenario('OWNER');

    await expect(
      useCase.execute({ actor, groupId: 'grp_ajeno', input: juan }),
    ).rejects.toBeInstanceOf(GroupNotFoundException);
    expect(invitations.invitations).toEqual([]);
  });

  it('shouldThrowEmailNotAllowedWhenEmailIsNotOnAccessList', async () => {
    const { useCase, invitations, isAllowed } = scenario('OWNER');
    isAllowed.mockResolvedValue(false);

    await expect(
      useCase.execute({ actor, groupId: 'grp_casa', input: juan }),
    ).rejects.toBeInstanceOf(EmailNotAllowedException);
    expect(invitations.invitations).toEqual([]);
  });

  it('shouldThrowMemberAlreadyActiveAndReturnSamePendingInvitation', async () => {
    const { useCase, invitations, setNow } = scenario('OWNER', 'eva@example.com');

    await expect(
      useCase.execute({
        actor,
        groupId: 'grp_casa',
        input: { email: 'EVA@example.com', role: 'MEMBER' },
      }),
    ).rejects.toBeInstanceOf(MemberAlreadyActiveException);

    const first = await useCase.execute({ actor, groupId: 'grp_casa', input: juan });
    setNow(new Date('2026-11-19T14:59:59.999Z'));
    const again = await useCase.execute({
      actor,
      groupId: 'grp_casa',
      input: { email: 'juan@example.com', role: 'ADMINISTRATOR' },
    });

    expect(again).toEqual(first);
    expect(invitations.invitations).toHaveLength(1);
  });
});
