import { GroupId } from '../../domain/group/GroupId';
import { InvitableRole, Invitation, InvitationStatus } from '../../domain/invitation/Invitation';
import { InvitationRepository } from '../../domain/invitation/InvitationRepository';
import { Email } from '../../domain/user/Email';
import { UserId } from '../../domain/user/UserId';
import { fromIsoDate, toIsoDate } from './isoDate';

interface InvitationRow {
  id: string;
  group_id: string;
  email: string;
  role: InvitableRole;
  status: InvitationStatus;
  invited_by: string;
  created_at: string;
  expires_at: string;
}

export class D1InvitationRepository implements InvitationRepository {
  constructor(private readonly database: D1Database) {}

  async findPending(groupId: GroupId, email: Email): Promise<Invitation | null> {
    const row = await this.database
      .prepare(
        `SELECT id, group_id, email, role, status, invited_by, created_at, expires_at
         FROM invitations
         WHERE group_id = ? AND email = ? AND status = 'PENDING'
         ORDER BY created_at DESC
         LIMIT 1`,
      )
      .bind(groupId.toString(), email.toString())
      .first<InvitationRow>();
    if (row === null) {
      return null;
    }
    return Invitation.restore({
      id: row.id,
      groupId: GroupId.fromString(row.group_id),
      email: Email.fromString(row.email),
      role: row.role,
      status: row.status,
      invitedBy: UserId.fromString(row.invited_by),
      createdAt: fromIsoDate(row.created_at),
      expiresAt: fromIsoDate(row.expires_at),
    });
  }

  async save(invitation: Invitation): Promise<void> {
    const createdAt = toIsoDate(invitation.createdAt);
    await this.database
      .prepare(
        `INSERT INTO invitations (id, group_id, email, role, status, invited_by, created_at, expires_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        invitation.id,
        invitation.groupId.toString(),
        invitation.email.toString(),
        invitation.role,
        invitation.status,
        invitation.invitedBy.toString(),
        createdAt,
        toIsoDate(invitation.expiresAt),
        createdAt,
      )
      .run();
  }
}
