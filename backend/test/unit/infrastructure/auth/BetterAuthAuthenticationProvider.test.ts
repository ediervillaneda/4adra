import { describe, it, expect, vi } from 'vitest';
import {
  BetterAuthAuthenticationProvider,
  SessionLookup,
} from '../../../../src/infrastructure/auth/BetterAuthAuthenticationProvider';
import { SessionCredential } from '../../../../src/domain/auth/SessionCredential';
import { UnauthenticatedException } from '../../../../src/domain/auth/errors';

const cookie = SessionCredential.fromCookieHeader('better-auth.session_token=abc');

describe('BetterAuthAuthenticationProvider', () => {
  it('shouldRejectEmptyCredentialWithoutCallingLookup', async () => {
    const lookup = vi.fn<SessionLookup>();
    const provider = new BetterAuthAuthenticationProvider(lookup);

    await expect(
      provider.resolveSession(SessionCredential.fromCookieHeader(null)),
    ).rejects.toBeInstanceOf(UnauthenticatedException);
    expect(lookup).not.toHaveBeenCalled();
  });

  it('shouldRejectWhenNoSession', async () => {
    const provider = new BetterAuthAuthenticationProvider(
      vi.fn<SessionLookup>().mockResolvedValue(null),
    );

    await expect(provider.resolveSession(cookie)).rejects.toBeInstanceOf(UnauthenticatedException);
  });

  it('shouldPropagateInfrastructureFailureInsteadOfReportingUnauthenticated', async () => {
    const outage = new Error('D1_ERROR: database unavailable');
    const provider = new BetterAuthAuthenticationProvider(
      vi.fn<SessionLookup>().mockRejectedValue(outage),
    );

    const failure = provider.resolveSession(cookie);

    await expect(failure).rejects.toBe(outage);
  });

  it('shouldPassCookieHeaderToLookup', async () => {
    const lookup = vi.fn<SessionLookup>().mockResolvedValue({
      user: { id: 'usr_ana', email: 'ana@example.com', name: 'Ana Pérez', image: null },
    });
    const provider = new BetterAuthAuthenticationProvider(lookup);

    await provider.resolveSession(cookie);

    const headers = lookup.mock.calls[0]?.[0];
    expect(headers?.get('cookie')).toBe('better-auth.session_token=abc');
  });

  it('shouldMapSessionUserToActor', async () => {
    const provider = new BetterAuthAuthenticationProvider(
      vi.fn<SessionLookup>().mockResolvedValue({
        user: {
          id: 'usr_ana',
          email: 'ana@example.com',
          name: 'Ana Pérez',
          image: 'https://x/y.png',
        },
      }),
    );

    const actor = await provider.resolveSession(cookie);

    expect(actor.userId.toString()).toBe('usr_ana');
    expect(actor.email.toString()).toBe('ana@example.com');
    expect(actor.displayName).toBe('Ana Pérez');
    expect(actor.photoUrl).toBe('https://x/y.png');
  });

  it('shouldMapBlankNameAndMissingImageToNull', async () => {
    const provider = new BetterAuthAuthenticationProvider(
      vi.fn<SessionLookup>().mockResolvedValue({
        user: { id: 'usr_ana', email: 'ana@example.com', name: '  ' },
      }),
    );

    const actor = await provider.resolveSession(cookie);

    expect(actor.displayName).toBeNull();
    expect(actor.photoUrl).toBeNull();
  });
});
