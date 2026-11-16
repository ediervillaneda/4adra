import { describe, it, expect } from 'vitest';
import { ArchiveGroupUseCase } from '../../../../src/application/group/ArchiveGroupUseCase';
import { ChangeMemberRoleUseCase } from '../../../../src/application/group/ChangeMemberRoleUseCase';
import { LeaveGroupUseCase } from '../../../../src/application/group/LeaveGroupUseCase';
import { RemoveMemberUseCase } from '../../../../src/application/group/RemoveMemberUseCase';
import { UpdateGroupUseCase } from '../../../../src/application/group/UpdateGroupUseCase';
import { AcceptInvitationUseCase } from '../../../../src/application/invitation/AcceptInvitationUseCase';
import { InviteMemberUseCase } from '../../../../src/application/invitation/InviteMemberUseCase';
import { GroupArchivedException } from '../../../../src/domain/group/errors';
import { GroupId } from '../../../../src/domain/group/GroupId';
import { InviteLinkNotFoundException } from '../../../../src/domain/invitation/errors';
import { NOW, juan } from '../../../support/invitationScenario';
import {
  InviteLinkScenario,
  ana,
  eva,
  inviteLinkScenario,
} from '../../../support/inviteLinkScenario';

const casa = GroupId.fromString('grp_casa');

/** Lo que una operación rechazada no debe cambiar. */
interface Snapshot {
  version: number | undefined;
  name: string | undefined;
  members: string[];
  invitations: string[];
  links: number;
}

interface ArchivedCasa extends InviteLinkScenario {
  code: string;
  snapshot: () => Promise<Snapshot>;
  before: Snapshot;
}

/**
 * "Casa" archivado por Ana (Owner), con Juan como Administrator, una invitación pendiente para Eva
 * y un enlace creado antes de archivar.
 */
async function archivedCasa(): Promise<ArchivedCasa> {
  const scenario = inviteLinkScenario();
  scenario.joinAs('grp_casa', 'ADMINISTRATOR');
  scenario.seedInvitation({ id: 'inv_eva', groupId: 'grp_casa', email: 'eva@example.com' });
  const { code } = await scenario.createLink.execute({ actor: ana, groupId: 'grp_casa' });
  await new ArchiveGroupUseCase(scenario.groups, () => NOW).execute({
    actor: ana,
    groupId: 'grp_casa',
  });
  const snapshot = async (): Promise<Snapshot> => ({
    version: scenario.groups.groupById(casa)?.version,
    name: scenario.groups.groupById(casa)?.name,
    members: (await scenario.groups.listActiveMembers(casa))
      .map((member) => `${member.userId.toString()}:${member.role}`)
      .sort(),
    invitations: scenario.invitations.invitations.map((entry) => `${entry.id}:${entry.status}`),
    links: scenario.links.stored.length,
  });
  return { ...scenario, code, snapshot, before: await snapshot() };
}

describe('Un grupo archivado es de solo lectura', () => {
  it.each([
    [
      'editar',
      (s: ArchivedCasa): Promise<unknown> =>
        new UpdateGroupUseCase(s.groups, () => NOW).execute({
          actor: ana,
          groupId: 'grp_casa',
          input: { name: 'Casa nueva', description: null },
        }),
    ],
    [
      'invitar',
      (s: ArchivedCasa): Promise<unknown> =>
        new InviteMemberUseCase(
          s.groups,
          { isAllowed: () => Promise.resolve(true) },
          s.invitations,
          () => 'inv_nueva',
          () => NOW,
        ).execute({
          actor: ana,
          groupId: 'grp_casa',
          input: { email: 'luis@example.com', role: 'MEMBER' },
        }),
    ],
    [
      'crear enlace',
      (s: ArchivedCasa): Promise<unknown> =>
        s.createLink.execute({ actor: ana, groupId: 'grp_casa' }),
    ],
    [
      'cambiar rol',
      (s: ArchivedCasa): Promise<unknown> =>
        new ChangeMemberRoleUseCase(s.groups, () => NOW).execute({
          actor: ana,
          groupId: 'grp_casa',
          userId: 'usr_juan',
          input: { role: 'MEMBER' },
        }),
    ],
    [
      'remover',
      (s: ArchivedCasa): Promise<unknown> =>
        new RemoveMemberUseCase(s.groups, () => NOW).execute({
          actor: ana,
          groupId: 'grp_casa',
          userId: 'usr_juan',
        }),
    ],
    [
      'salir',
      (s: ArchivedCasa): Promise<unknown> =>
        new LeaveGroupUseCase(s.groups, () => NOW).execute({ actor: juan, groupId: 'grp_casa' }),
    ],
    [
      'aceptar invitación',
      (s: ArchivedCasa): Promise<unknown> =>
        new AcceptInvitationUseCase(s.invitations, s.groups, s.users, () => NOW).execute({
          actor: eva,
          invitationId: 'inv_eva',
        }),
    ],
  ] as const)('shouldRejectWithGroupArchivedAndChangeNothing (%s)', async (_name, operation) => {
    const scenario = await archivedCasa();

    await expect(operation(scenario)).rejects.toThrow(GroupArchivedException);
    expect(await scenario.snapshot()).toEqual(scenario.before);
  });

  it('shouldRejectJoiningWithItsLinkAsNotFound', async () => {
    const scenario = await archivedCasa();

    await expect(
      scenario.joinWithLink.execute({ actor: eva, code: scenario.code }),
    ).rejects.toThrow(InviteLinkNotFoundException);
    expect(await scenario.snapshot()).toEqual(scenario.before);
  });
});
