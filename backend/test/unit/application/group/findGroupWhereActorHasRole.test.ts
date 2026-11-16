import { describe, it, expect } from 'vitest';
import { findGroupWhereActorHasRole } from '../../../../src/application/group/findGroupWhereActorHasRole';
import {
  GroupNotFoundException,
  PermissionDeniedException,
} from '../../../../src/domain/group/errors';
import { GroupId } from '../../../../src/domain/group/GroupId';
import { invitationScenario, juan } from '../../../support/invitationScenario';

const casa = GroupId.fromString('grp_casa');

describe('findGroupWhereActorHasRole', () => {
  it('shouldReturnGroupWhenActorRoleIsAllowed', async () => {
    const { groups, joinAs } = invitationScenario();
    joinAs('grp_casa', 'ADMINISTRATOR');

    const memberGroup = await findGroupWhereActorHasRole(groups, casa, juan.userId, [
      'OWNER',
      'ADMINISTRATOR',
    ]);

    expect(memberGroup.group.name).toBe('Casa');
    expect(memberGroup.role).toBe('ADMINISTRATOR');
  });

  it('shouldThrowPermissionDeniedWhenActorRoleIsNotAllowed', async () => {
    const { groups, joinAs } = invitationScenario();
    joinAs('grp_casa', 'ADMINISTRATOR');

    await expect(
      findGroupWhereActorHasRole(groups, casa, juan.userId, ['OWNER']),
    ).rejects.toBeInstanceOf(PermissionDeniedException);
  });

  it('shouldThrowGroupNotFoundWhenActorIsNotActiveMember', async () => {
    const { groups } = invitationScenario();

    await expect(
      findGroupWhereActorHasRole(groups, casa, juan.userId, ['OWNER']),
    ).rejects.toBeInstanceOf(GroupNotFoundException);
  });
});
