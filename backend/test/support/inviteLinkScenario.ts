import { CreateInviteLinkUseCase } from '../../src/application/invitation/CreateInviteLinkUseCase';
import { GetInviteLinkUseCase } from '../../src/application/invitation/GetInviteLinkUseCase';
import { JoinGroupWithInviteLinkUseCase } from '../../src/application/invitation/JoinGroupWithInviteLinkUseCase';
import { AuthenticatedActor } from '../../src/domain/auth/AuthenticatedActor';
import { Email } from '../../src/domain/user/Email';
import { UserId } from '../../src/domain/user/UserId';
import { InMemoryInviteLinkRepository } from './InMemoryInviteLinkRepository';
import { NOW, invitationScenario, InvitationScenario } from './invitationScenario';

/** Ana, Owner de "Casa" y "Playa": crea los enlaces. */
export const ana: AuthenticatedActor = {
  userId: UserId.fromString('usr_ana'),
  email: Email.fromString('ana@example.com'),
  displayName: 'Ana',
  photoUrl: null,
};

/** Eva entra a 4adra por primera vez con el enlace: todavía no tiene perfil. */
export const eva: AuthenticatedActor = {
  userId: UserId.fromString('usr_eva'),
  email: Email.fromString('eva@example.com'),
  displayName: 'Eva',
  photoUrl: null,
};

/** Hash de prueba: distinto del código, y el mismo para el mismo código. */
export const fakeHash = (code: string): Promise<string> => Promise.resolve(`sha256(${code})`);

export interface InviteLinkScenario extends InvitationScenario {
  links: InMemoryInviteLinkRepository;
  createLink: CreateInviteLinkUseCase;
  getLink: GetInviteLinkUseCase;
  joinWithLink: JoinGroupWithInviteLinkUseCase;
  /** Mueve el reloj de los tres casos de uso. */
  setNow: (date: Date) => void;
}

/** Ana (Owner de "Casa") comparte enlaces; los códigos salen en orden: codigo-1, codigo-2… */
export function inviteLinkScenario(): InviteLinkScenario {
  const base = invitationScenario();
  const links = new InMemoryInviteLinkRepository(base.groups);
  let now = NOW;
  let sequence = 0;
  const clock = (): Date => now;

  return {
    ...base,
    links,
    createLink: new CreateInviteLinkUseCase(
      base.groups,
      links,
      () => `lnk_${sequence + 1}`,
      () => {
        sequence += 1;
        return `codigo-${sequence}`;
      },
      fakeHash,
      clock,
    ),
    getLink: new GetInviteLinkUseCase(links, fakeHash, clock),
    joinWithLink: new JoinGroupWithInviteLinkUseCase(
      links,
      base.groups,
      base.users,
      fakeHash,
      clock,
    ),
    setNow: (date): void => {
      now = date;
    },
  };
}
