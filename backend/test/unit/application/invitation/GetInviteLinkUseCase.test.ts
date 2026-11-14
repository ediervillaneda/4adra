import { describe, it, expect } from 'vitest';
import {
  InviteLinkExpiredException,
  InviteLinkNotFoundException,
} from '../../../../src/domain/invitation/errors';
import { ana, inviteLinkScenario } from '../../../support/inviteLinkScenario';

describe('GetInviteLinkUseCase', () => {
  it('shouldReturnGroupNameAndExpiryForValidLink', async () => {
    const { createLink, getLink } = inviteLinkScenario();
    const { code } = await createLink.execute({ actor: ana, groupId: 'grp_casa' });

    const view = await getLink.execute({ code });

    expect(view).toEqual({
      groupId: 'grp_casa',
      groupName: 'Casa',
      expiresAt: '2026-11-20T12:00:00.000Z',
    });
  });

  it('shouldThrowInviteLinkNotFoundForUnknownOrReplacedCode (unknown)', async () => {
    const { createLink, getLink } = inviteLinkScenario();
    await createLink.execute({ actor: ana, groupId: 'grp_casa' });

    await expect(getLink.execute({ code: 'no-existe' })).rejects.toBeInstanceOf(
      InviteLinkNotFoundException,
    );
  });

  it('shouldThrowInviteLinkNotFoundForUnknownOrReplacedCode (replaced)', async () => {
    const { createLink, getLink } = inviteLinkScenario();
    const first = await createLink.execute({ actor: ana, groupId: 'grp_casa' });
    const second = await createLink.execute({ actor: ana, groupId: 'grp_casa' });

    await expect(getLink.execute({ code: first.code })).rejects.toBeInstanceOf(
      InviteLinkNotFoundException,
    );
    expect((await getLink.execute({ code: second.code })).groupName).toBe('Casa');
  });

  it('shouldThrowInviteLinkExpiredAfterSevenDays', async () => {
    const { createLink, getLink, setNow } = inviteLinkScenario();
    const { code } = await createLink.execute({ actor: ana, groupId: 'grp_casa' });

    setNow(new Date('2026-11-20T11:59:59.999Z'));
    expect((await getLink.execute({ code })).groupName).toBe('Casa');

    setNow(new Date('2026-11-20T12:00:00.000Z'));
    await expect(getLink.execute({ code })).rejects.toBeInstanceOf(InviteLinkExpiredException);
  });
});
