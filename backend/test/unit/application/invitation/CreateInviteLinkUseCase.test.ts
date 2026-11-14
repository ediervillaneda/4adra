import { describe, it, expect } from 'vitest';
import {
  GroupNotFoundException,
  PermissionDeniedException,
} from '../../../../src/domain/group/errors';
import { juan } from '../../../support/invitationScenario';
import { ana, inviteLinkScenario } from '../../../support/inviteLinkScenario';

describe('CreateInviteLinkUseCase', () => {
  it('shouldCreateLinkValidForSevenDays (OWNER)', async () => {
    const { createLink, links } = inviteLinkScenario();

    const view = await createLink.execute({ actor: ana, groupId: 'grp_casa' });

    // NOW = 2026-11-13T12:00Z: vence 7 días después.
    expect(view).toEqual({
      groupId: 'grp_casa',
      code: 'codigo-1',
      expiresAt: '2026-11-20T12:00:00.000Z',
    });
    // Solo se guarda el hash del código, nunca el código.
    expect(links.stored.map((entry) => entry.link.codeHash)).toEqual(['sha256(codigo-1)']);
    expect(JSON.stringify(links.stored)).not.toContain('"codigo-1"');
  });

  it('shouldCreateLinkValidForSevenDays (ADMINISTRATOR)', async () => {
    const { createLink, joinAs } = inviteLinkScenario();
    joinAs('grp_casa', 'ADMINISTRATOR');

    const view = await createLink.execute({ actor: juan, groupId: 'grp_casa' });

    expect(view).toEqual({
      groupId: 'grp_casa',
      code: 'codigo-1',
      expiresAt: '2026-11-20T12:00:00.000Z',
    });
  });

  it.each(['MEMBER', 'READ_ONLY'] as const)(
    'shouldThrowPermissionDeniedForMemberAndReadOnly (%s)',
    async (role) => {
      const { createLink, joinAs, links } = inviteLinkScenario();
      joinAs('grp_casa', role);

      await expect(createLink.execute({ actor: juan, groupId: 'grp_casa' })).rejects.toBeInstanceOf(
        PermissionDeniedException,
      );
      expect(links.stored).toEqual([]);
    },
  );

  it.each(['grp_casa', 'grp_inexistente'])(
    'shouldThrowGroupNotFoundWhenActorIsNotActiveMember (%s)',
    async (groupId) => {
      const { createLink, links } = inviteLinkScenario();

      await expect(createLink.execute({ actor: juan, groupId })).rejects.toBeInstanceOf(
        GroupNotFoundException,
      );
      expect(links.stored).toEqual([]);
    },
  );
});
