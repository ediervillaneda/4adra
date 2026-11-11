import { describe, it, expect, vi } from 'vitest';
import {
  BetterAuthAuthenticationProvider,
  SessionLookup,
  SessionUser,
} from '../../../../src/infrastructure/auth/BetterAuthAuthenticationProvider';
import { SessionCredential } from '../../../../src/domain/auth/SessionCredential';
import { UnauthenticatedException } from '../../../../src/domain/auth/errors';

const cookie = SessionCredential.fromCookieHeader('better-auth.session_token=abc');

function lookupReturning(user: SessionUser | null, setCookies: string[] = []): SessionLookup {
  return vi.fn<SessionLookup>().mockResolvedValue({
    session: user === null ? null : { user },
    setCookies,
  });
}

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
    const provider = new BetterAuthAuthenticationProvider(lookupReturning(null));

    await expect(provider.resolveSession(cookie)).rejects.toBeInstanceOf(UnauthenticatedException);
  });

  it('shouldPropagateInfrastructureFailureInsteadOfReportingUnauthenticated', async () => {
    const outage = new Error('D1_ERROR: database unavailable');
    const provider = new BetterAuthAuthenticationProvider(
      vi.fn<SessionLookup>().mockRejectedValue(outage),
    );

    await expect(provider.resolveSession(cookie)).rejects.toBe(outage);
  });

  it('shouldPassCookieHeaderToLookup', async () => {
    const lookup = lookupReturning({
      id: 'usr_ana',
      email: 'ana@example.com',
      name: 'Ana Pérez',
      image: null,
    });
    const provider = new BetterAuthAuthenticationProvider(lookup);

    await provider.resolveSession(cookie);

    const headers = vi.mocked(lookup).mock.calls[0]?.[0];
    expect(headers?.get('cookie')).toBe('better-auth.session_token=abc');
  });

  it('shouldMapSessionUserToActor', async () => {
    const provider = new BetterAuthAuthenticationProvider(
      lookupReturning({
        id: 'usr_ana',
        email: 'ana@example.com',
        name: 'Ana Pérez',
        image: 'https://x/y.png',
      }),
    );

    const { actor } = await provider.resolveSession(cookie);

    expect(actor.userId.toString()).toBe('usr_ana');
    expect(actor.email.toString()).toBe('ana@example.com');
    expect(actor.displayName).toBe('Ana Pérez');
    expect(actor.photoUrl).toBe('https://x/y.png');
  });

  it('shouldMapBlankNameAndMissingImageToNull', async () => {
    const provider = new BetterAuthAuthenticationProvider(
      lookupReturning({ id: 'usr_ana', email: 'ana@example.com', name: '  ' }),
    );

    const { actor } = await provider.resolveSession(cookie);

    expect(actor.displayName).toBeNull();
    expect(actor.photoUrl).toBeNull();
  });

  it('shouldReturnRenewedCredentialsWhenSessionWasRefreshed', async () => {
    const provider = new BetterAuthAuthenticationProvider(
      lookupReturning({ id: 'usr_ana', email: 'ana@example.com', name: 'Ana' }, [
        'better-auth.session_token=renewed; Path=/; HttpOnly',
      ]),
    );

    const { renewedCredentials } = await provider.resolveSession(cookie);

    expect(renewedCredentials).toEqual(['better-auth.session_token=renewed; Path=/; HttpOnly']);
  });
});
