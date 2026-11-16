import { describe, it, expect } from 'vitest';
import { ArchiveGroupUseCase } from '../../../../src/application/group/ArchiveGroupUseCase';
import { GroupId } from '../../../../src/domain/group/GroupId';
import {
  GroupNotFoundException,
  PermissionDeniedException,
} from '../../../../src/domain/group/errors';
import { NOW, invitationScenario, juan } from '../../../support/invitationScenario';
import { ana } from '../../../support/inviteLinkScenario';

const casa = GroupId.fromString('grp_casa');

describe('ArchiveGroupUseCase', () => {
  it('shouldArchiveTheGroupForEveryMember', async () => {
    const scenario = invitationScenario();
    scenario.joinAs('grp_casa', 'MEMBER');
    const archiveGroup = new ArchiveGroupUseCase(scenario.groups, () => NOW);

    const view = await archiveGroup.execute({ actor: ana, groupId: 'grp_casa' });

    expect(view).toMatchObject({
      id: 'grp_casa',
      name: 'Casa',
      status: 'ARCHIVED',
      role: 'OWNER',
      updatedAt: NOW.toISOString(),
    });
    // Juan sigue siendo miembro y ve el grupo archivado.
    const seen = await scenario.groups.findForMember(casa, juan.userId);
    expect([seen?.group.status, seen?.group.version, seen?.role]).toEqual([
      'ARCHIVED',
      2,
      'MEMBER',
    ]);
  });

  it('shouldAnswerTheSameWhenAlreadyArchived', async () => {
    const scenario = invitationScenario();
    const later = new Date('2026-11-14T09:00:00.000Z');
    let now = NOW;
    const archiveGroup = new ArchiveGroupUseCase(scenario.groups, () => now);
    const first = await archiveGroup.execute({ actor: ana, groupId: 'grp_casa' });

    now = later;
    const second = await archiveGroup.execute({ actor: ana, groupId: 'grp_casa' });

    expect(second).toEqual(first);
    expect(scenario.groups.groupById(casa)?.version).toBe(2);
  });

  it.each(['ADMINISTRATOR', 'MEMBER', 'READ_ONLY'] as const)(
    'shouldThrowPermissionDeniedAndKeepTheGroupActive (%s)',
    async (role) => {
      const scenario = invitationScenario();
      scenario.joinAs('grp_casa', role);
      const archiveGroup = new ArchiveGroupUseCase(scenario.groups, () => NOW);

      await expect(archiveGroup.execute({ actor: juan, groupId: 'grp_casa' })).rejects.toThrow(
        PermissionDeniedException,
      );
      expect(scenario.groups.groupById(casa)?.status).toBe('ACTIVE');
    },
  );

  it('shouldThrowGroupNotFoundForNonMembers', async () => {
    const scenario = invitationScenario();
    const archiveGroup = new ArchiveGroupUseCase(scenario.groups, () => NOW);

    await expect(archiveGroup.execute({ actor: juan, groupId: 'grp_casa' })).rejects.toThrow(
      GroupNotFoundException,
    );
    expect(scenario.groups.groupById(casa)?.status).toBe('ACTIVE');
  });
});
