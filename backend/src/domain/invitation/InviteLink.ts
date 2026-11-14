import { GroupId } from '../group/GroupId';
import { UserId } from '../user/UserId';

/** Vigencia de un enlace de invitación, igual que la de una invitación por correo (ADR-011). */
const VALIDITY_MS = 7 * 24 * 60 * 60 * 1000;

interface InviteLinkProperties {
  id: string;
  groupId: GroupId;
  /** Hash SHA-256 del código; el código en claro nunca se guarda. */
  codeHash: string;
  createdBy: UserId;
  createdAt: Date;
  expiresAt: Date;
}

/** Enlace para entrar a un grupo como Member, usable por varias personas (docs/api/Members.md). */
export class InviteLink {
  readonly id: string;
  readonly groupId: GroupId;
  readonly codeHash: string;
  readonly createdBy: UserId;
  readonly createdAt: Date;
  readonly expiresAt: Date;

  private constructor(properties: InviteLinkProperties) {
    this.id = properties.id;
    this.groupId = properties.groupId;
    this.codeHash = properties.codeHash;
    this.createdBy = properties.createdBy;
    this.createdAt = properties.createdAt;
    this.expiresAt = properties.expiresAt;
  }

  static create(
    id: string,
    groupId: GroupId,
    codeHash: string,
    createdBy: UserId,
    now: Date,
  ): InviteLink {
    return new InviteLink({
      id,
      groupId,
      codeHash,
      createdBy,
      createdAt: now,
      expiresAt: new Date(now.getTime() + VALIDITY_MS),
    });
  }

  static restore(properties: InviteLinkProperties): InviteLink {
    return new InviteLink(properties);
  }

  /** Vale hasta su vencimiento; al cumplirse los 7 días ya no. */
  isValidAt(now: Date): boolean {
    return now.getTime() < this.expiresAt.getTime();
  }
}
