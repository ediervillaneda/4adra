import { FirebaseAuthenticationProvider } from '../../../../src/infrastructure/firebase/FirebaseAuthenticationProvider';
import { UnauthenticatedException } from '../../../../src/domain/auth/errors';

function authStub(verifyIdToken: jest.Mock): never {
  return { verifyIdToken } as never;
}

describe('FirebaseAuthenticationProvider', () => {
  it('shouldReturnActorFromValidToken', async () => {
    const verifyIdToken = jest.fn().mockResolvedValue({
      uid: 'usr_ana',
      email: 'Ana@Example.com',
      name: 'Ana Pérez',
      picture: 'https://example.com/ana.png',
    });
    const provider = new FirebaseAuthenticationProvider(authStub(verifyIdToken));

    const actor = await provider.verifyIdToken('a-valid-token');

    expect(actor.userId.toString()).toBe('usr_ana');
    expect(actor.email.toString()).toBe('ana@example.com');
    expect(actor.displayName).toBe('Ana Pérez');
    expect(actor.photoUrl).toBe('https://example.com/ana.png');
  });

  it('shouldDefaultDisplayNameAndPhotoToNullWhenAbsent', async () => {
    const verifyIdToken = jest.fn().mockResolvedValue({ uid: 'usr_ana', email: 'ana@example.com' });
    const provider = new FirebaseAuthenticationProvider(authStub(verifyIdToken));

    const actor = await provider.verifyIdToken('a-valid-token');

    expect(actor.displayName).toBeNull();
    expect(actor.photoUrl).toBeNull();
  });

  it('shouldThrowUnauthenticatedWhenTokenVerificationFails', async () => {
    const verifyIdToken = jest.fn().mockRejectedValue(new Error('expired'));
    const provider = new FirebaseAuthenticationProvider(authStub(verifyIdToken));

    await expect(provider.verifyIdToken('expired-token')).rejects.toThrow(UnauthenticatedException);
  });

  it('shouldThrowUnauthenticatedWhenTokenHasNoEmail', async () => {
    const verifyIdToken = jest.fn().mockResolvedValue({ uid: 'usr_ana' });
    const provider = new FirebaseAuthenticationProvider(authStub(verifyIdToken));

    await expect(provider.verifyIdToken('no-email-token')).rejects.toThrow(
      UnauthenticatedException,
    );
  });
});
