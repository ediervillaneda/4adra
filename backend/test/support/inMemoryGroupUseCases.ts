import { CreateGroupUseCase } from '../../src/application/group/CreateGroupUseCase';
import { ListMyGroupsUseCase } from '../../src/application/group/ListMyGroupsUseCase';
import { GetGroupUseCase } from '../../src/application/group/GetGroupUseCase';
import { ListGroupMembersUseCase } from '../../src/application/group/ListGroupMembersUseCase';
import { InviteMemberUseCase } from '../../src/application/invitation/InviteMemberUseCase';
import { ListMyInvitationsUseCase } from '../../src/application/invitation/ListMyInvitationsUseCase';
import { AcceptInvitationUseCase } from '../../src/application/invitation/AcceptInvitationUseCase';
import { DeclineInvitationUseCase } from '../../src/application/invitation/DeclineInvitationUseCase';
import { InMemoryGroupRepository } from './InMemoryGroupRepository';
import { InMemoryInvitationRepository } from './InMemoryInvitationRepository';
import { InMemoryUserRepository } from './InMemoryUserRepository';

/** Casos de uso de grupos sobre repositorios en memoria, para armar AppDependencies en pruebas. */
export function inMemoryGroupUseCases(now: () => Date = () => new Date('2026-11-12T15:00:00Z')): {
  createGroupUseCase: CreateGroupUseCase;
  listMyGroupsUseCase: ListMyGroupsUseCase;
  getGroupUseCase: GetGroupUseCase;
  listGroupMembersUseCase: ListGroupMembersUseCase;
  inviteMemberUseCase: InviteMemberUseCase;
  listMyInvitationsUseCase: ListMyInvitationsUseCase;
  acceptInvitationUseCase: AcceptInvitationUseCase;
  declineInvitationUseCase: DeclineInvitationUseCase;
} {
  const users = new InMemoryUserRepository();
  const groups = new InMemoryGroupRepository(users);
  const invitations = new InMemoryInvitationRepository(groups, users);
  let sequence = 0;
  return {
    createGroupUseCase: new CreateGroupUseCase(
      groups,
      users,
      () => `grp_${String((sequence += 1))}`,
      now,
    ),
    listMyGroupsUseCase: new ListMyGroupsUseCase(groups),
    getGroupUseCase: new GetGroupUseCase(groups),
    listGroupMembersUseCase: new ListGroupMembersUseCase(groups),
    inviteMemberUseCase: new InviteMemberUseCase(
      groups,
      { isAllowed: () => Promise.resolve(true) },
      invitations,
      () => `inv_${String((sequence += 1))}`,
      now,
    ),
    listMyInvitationsUseCase: new ListMyInvitationsUseCase(invitations, now),
    acceptInvitationUseCase: new AcceptInvitationUseCase(invitations, users, now),
    declineInvitationUseCase: new DeclineInvitationUseCase(invitations, now),
  };
}
