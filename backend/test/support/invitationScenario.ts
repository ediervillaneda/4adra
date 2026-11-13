import { AuthenticatedActor } from '../../src/domain/auth/AuthenticatedActor';
import { Group } from '../../src/domain/group/Group';
import { GroupId } from '../../src/domain/group/GroupId';
import { MemberRole } from '../../src/domain/group/MemberRole';
import {
  InvitableRole,
  Invitation,
  InvitationStatus,
} from '../../src/domain/invitation/Invitation';
import { Email } from '../../src/domain/user/Email';
import { User } from '../../src/domain/user/User';
import { UserId } from '../../src/domain/user/UserId';
import { InMemoryGroupRepository } from './InMemoryGroupRepository';
import { InMemoryInvitationRepository } from './InMemoryInvitationRepository';
import { InMemoryUserRepository } from './InMemoryUserRepository';

/** Día en que Ana envía las invitaciones: vencen el 2026-11-19T15:00:00.000Z. */
export const SENT = new Date('2026-11-12T15:00:00.000Z');
/** Momento de la consulta: las invitaciones enviadas en `SENT` siguen vigentes. */
export const NOW = new Date('2026-11-13T12:00:00.000Z');

/** Juan, el invitado que responde. */
export const juan: AuthenticatedActor = {
  userId: UserId.fromString('usr_juan'),
  email: Email.fromString('juan@example.com'),
  displayName: 'Juan',
  photoUrl: null,
};

interface SeededInvitation {
  id: string;
  groupId?: string;
  email?: string;
  role?: InvitableRole;
  status?: InvitationStatus;
  createdAt?: Date;
}

export interface InvitationScenario {
  users: InMemoryUserRepository;
  groups: InMemoryGroupRepository;
  invitations: InMemoryInvitationRepository;
  seedInvitation: (seed: SeededInvitation) => void;
  joinAs: (groupId: string, role: MemberRole) => void;
  statusOf: (invitationId: string) => InvitationStatus | undefined;
}

function seedUser(users: InMemoryUserRepository, id: string, name: string, email: string): void {
  users.seed(
    User.create({
      id: UserId.fromString(id),
      displayName: name,
      email: Email.fromString(email),
      photoUrl: null,
      preferredCurrency: 'COP',
      language: 'es',
      timeZone: 'America/Bogota',
      status: 'ACTIVE',
      createdAt: SENT,
      updatedAt: SENT,
    }),
  );
}

function ownedByAna(groups: InMemoryGroupRepository, id: string, name: string): Group {
  const group = Group.create(
    GroupId.fromString(id),
    { name, description: null, defaultCurrency: 'COP' },
    UserId.fromString('usr_ana'),
    SENT,
  );
  groups.seedMembership(group, { groupId: id, userId: 'usr_ana', role: 'OWNER', status: 'ACTIVE' });
  return group;
}

/** Ana (Owner de "Casa" y "Playa") invita; Juan responde. */
export function invitationScenario(): InvitationScenario {
  const users = new InMemoryUserRepository();
  seedUser(users, 'usr_ana', 'Ana', 'ana@example.com');
  seedUser(users, 'usr_juan', 'Juan', 'juan@example.com');
  const groups = new InMemoryGroupRepository(users);
  const groupsById = new Map<string, Group>([
    ['grp_casa', ownedByAna(groups, 'grp_casa', 'Casa')],
    ['grp_playa', ownedByAna(groups, 'grp_playa', 'Playa')],
  ]);
  const invitations = new InMemoryInvitationRepository(groups, users);

  return {
    users,
    groups,
    invitations,
    seedInvitation: (seed): void => {
      const createdAt = seed.createdAt ?? SENT;
      const created = Invitation.create(
        seed.id,
        GroupId.fromString(seed.groupId ?? 'grp_casa'),
        Email.fromString(seed.email ?? 'juan@example.com'),
        seed.role ?? 'MEMBER',
        UserId.fromString('usr_ana'),
        createdAt,
      );
      invitations.invitations.push(
        Invitation.restore({ ...created, status: seed.status ?? 'PENDING' }),
      );
    },
    joinAs: (groupId, role): void => {
      groups.seedMembership(groupsById.get(groupId) as Group, {
        groupId,
        userId: 'usr_juan',
        role,
        status: 'ACTIVE',
      });
    },
    statusOf: (invitationId) =>
      invitations.invitations.find((invitation) => invitation.id === invitationId)?.status,
  };
}
