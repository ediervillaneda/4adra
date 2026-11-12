import { GroupId } from '../group/GroupId';
import { Email } from '../user/Email';
import { UserId } from '../user/UserId';

/** Roles que se pueden asignar al invitar; `OWNER` solo llega por transferencia (docs/api/Members.md). */
export type InvitableRole = 'ADMINISTRATOR' | 'MEMBER' | 'READ_ONLY';

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'REVOKED';

/** Vigencia de una invitación (ADR-011). */
const VALIDITY_MS = 7 * 24 * 60 * 60 * 1000;

interface InvitationProperties {
  id: string;
  groupId: GroupId;
  email: Email;
  role: InvitableRole;
  status: InvitationStatus;
  invitedBy: UserId;
  createdAt: Date;
  expiresAt: Date;
}

/** Invitación por correo a un grupo (docs/domain/Member.md). */
export class Invitation {
  readonly id: string;
  readonly groupId: GroupId;
  readonly email: Email;
  readonly role: InvitableRole;
  readonly status: InvitationStatus;
  readonly invitedBy: UserId;
  readonly createdAt: Date;
  readonly expiresAt: Date;

  private constructor(properties: InvitationProperties) {
    this.id = properties.id;
    this.groupId = properties.groupId;
    this.email = properties.email;
    this.role = properties.role;
    this.status = properties.status;
    this.invitedBy = properties.invitedBy;
    this.createdAt = properties.createdAt;
    this.expiresAt = properties.expiresAt;
  }

  static create(
    id: string,
    groupId: GroupId,
    email: Email,
    role: InvitableRole,
    invitedBy: UserId,
    now: Date,
  ): Invitation {
    return new Invitation({
      id,
      groupId,
      email,
      role,
      status: 'PENDING',
      invitedBy,
      createdAt: now,
      expiresAt: new Date(now.getTime() + VALIDITY_MS),
    });
  }

  static restore(properties: InvitationProperties): Invitation {
    return new Invitation(properties);
  }

  /** Sigue pendiente mientras no llegue su vencimiento; al cumplirse los 7 días ya no vale. */
  isPendingAt(now: Date): boolean {
    return this.status === 'PENDING' && now.getTime() < this.expiresAt.getTime();
  }
}
