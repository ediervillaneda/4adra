import { describe, it, expect, vi } from 'vitest';
import { UpdateGroupUseCase } from '../../../../src/application/group/UpdateGroupUseCase';
import { GroupId } from '../../../../src/domain/group/GroupId';
import {
  GroupNotFoundException,
  PermissionDeniedException,
} from '../../../../src/domain/group/errors';
import { ValidationException } from '../../../../src/domain/errors/ValidationException';
import { NOW, invitationScenario, juan } from '../../../support/invitationScenario';
import { ana } from '../../../support/inviteLinkScenario';

describe('UpdateGroupUseCase', () => {
  it.each([
    ['OWNER', 'ana'],
    ['ADMINISTRATOR', 'juan'],
  ] as const)('shouldEditNameAndDescription (%s)', async (_role, who) => {
    const scenario = invitationScenario();
    scenario.joinAs('grp_casa', who === 'juan' ? 'ADMINISTRATOR' : 'MEMBER');
    const updateGroup = new UpdateGroupUseCase(scenario.groups, () => NOW);

    const view = await updateGroup.execute({
      actor: who === 'ana' ? ana : juan,
      groupId: 'grp_casa',
      input: { name: 'Casa de la playa', description: 'Arriendo y servicios' },
    });

    expect(view).toMatchObject({
      id: 'grp_casa',
      name: 'Casa de la playa',
      description: 'Arriendo y servicios',
      defaultCurrency: 'COP',
      updatedAt: NOW.toISOString(),
    });
    // El otro miembro también ve los datos nuevos.
    const otherId = who === 'ana' ? juan.userId : ana.userId;
    const seen = await scenario.groups.findForMember(GroupId.fromString('grp_casa'), otherId);
    expect([seen?.group.name, seen?.group.description, seen?.group.version]).toEqual([
      'Casa de la playa',
      'Arriendo y servicios',
      2,
    ]);
  });

  it.each(['MEMBER', 'READ_ONLY'] as const)(
    'shouldThrowPermissionDeniedAndKeepTheGroup (%s)',
    async (role) => {
      const scenario = invitationScenario();
      scenario.joinAs('grp_casa', role);
      const updateGroup = new UpdateGroupUseCase(scenario.groups, () => NOW);

      await expect(
        updateGroup.execute({
          actor: juan,
          groupId: 'grp_casa',
          input: { name: 'Otro nombre', description: null },
        }),
      ).rejects.toBeInstanceOf(PermissionDeniedException);
      expect(scenario.groups.groupById(GroupId.fromString('grp_casa'))?.name).toBe('Casa');
    },
  );

  it('shouldThrowGroupNotFoundWhenActorIsNotActiveMember', async () => {
    const scenario = invitationScenario();
    const updateGroup = new UpdateGroupUseCase(scenario.groups, () => NOW);

    await expect(
      updateGroup.execute({
        actor: juan,
        groupId: 'grp_casa',
        input: { name: 'Otro nombre', description: null },
      }),
    ).rejects.toBeInstanceOf(GroupNotFoundException);
    expect(scenario.groups.groupById(GroupId.fromString('grp_casa'))?.name).toBe('Casa');
  });

  it('shouldRejectAnInvalidBodyAndKeepTheGroup', async () => {
    const scenario = invitationScenario();
    const updateGroup = new UpdateGroupUseCase(scenario.groups, () => NOW);

    await expect(
      updateGroup.execute({
        actor: ana,
        groupId: 'grp_casa',
        input: { name: '', description: null, defaultCurrency: 'USD' },
      }),
    ).rejects.toBeInstanceOf(ValidationException);
    const group = scenario.groups.groupById(GroupId.fromString('grp_casa'));
    expect([group?.name, group?.defaultCurrency, group?.version]).toEqual(['Casa', 'COP', 1]);
  });

  it('shouldCheckPermissionBeforeValidatingTheBody', async () => {
    const scenario = invitationScenario();
    scenario.joinAs('grp_casa', 'READ_ONLY');
    const updateGroup = new UpdateGroupUseCase(scenario.groups, () => NOW);
    const invalid = { name: '', description: null };

    await expect(
      updateGroup.execute({ actor: juan, groupId: 'grp_casa', input: invalid }),
    ).rejects.toBeInstanceOf(PermissionDeniedException);
    await expect(
      updateGroup.execute({ actor: juan, groupId: 'grp_playa', input: invalid }),
    ).rejects.toBeInstanceOf(GroupNotFoundException);
  });

  it.each([
    ['PERMISSION_DENIED', PermissionDeniedException],
    ['NOT_MEMBER', GroupNotFoundException],
  ] as const)('shouldMapARejectedWriteToItsError (%s)', async (status, expected) => {
    const scenario = invitationScenario();
    scenario.joinAs('grp_casa', 'ADMINISTRATOR');
    vi.spyOn(scenario.groups, 'updateDetails').mockResolvedValue({ status });
    const updateGroup = new UpdateGroupUseCase(scenario.groups, () => NOW);

    await expect(
      updateGroup.execute({
        actor: juan,
        groupId: 'grp_casa',
        input: { name: 'Otro', description: null },
      }),
    ).rejects.toBeInstanceOf(expected);
  });
});
