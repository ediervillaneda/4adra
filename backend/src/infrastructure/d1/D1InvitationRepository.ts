import { GroupId } from '../../domain/group/GroupId';
import { InvitableRole, Invitation, InvitationStatus } from '../../domain/invitation/Invitation';
import {
  InvitationRepository,
  ReceivedInvitation,
} from '../../domain/invitation/InvitationRepository';
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

interface ReceivedInvitationRow extends InvitationRow {
  group_name: string;
  invited_by_name: string;
}

const COLUMNS = 'id, group_id, email, role, status, invited_by, created_at, expires_at';

function toInvitation(row: InvitationRow): Invitation {
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

export class D1InvitationRepository implements InvitationRepository {
  constructor(private readonly database: D1Database) {}

  async findPending(groupId: GroupId, email: Email): Promise<Invitation | null> {
    const row = await this.database
      .prepare(
        `SELECT ${COLUMNS}
         FROM invitations
         WHERE group_id = ? AND email = ? AND status = 'PENDING'
         ORDER BY created_at DESC
         LIMIT 1`,
      )
      .bind(groupId.toString(), email.toString())
      .first<InvitationRow>();
    return row === null ? null : toInvitation(row);
  }

  async listPendingFor(email: Email): Promise<ReceivedInvitation[]> {
    const result = await this.database
      .prepare(
        `SELECT i.id, i.group_id, i.email, i.role, i.status, i.invited_by, i.created_at,
                i.expires_at, g.name AS group_name, u.display_name AS invited_by_name
         FROM invitations i
         JOIN groups g ON g.id = i.group_id
         JOIN users u ON u.id = i.invited_by
         WHERE i.email = ? AND i.status = 'PENDING'
         ORDER BY i.created_at DESC`,
      )
      .bind(email.toString())
      .all<ReceivedInvitationRow>();
    return result.results.map((row) => ({
      invitation: toInvitation(row),
      groupName: row.group_name,
      invitedByName: row.invited_by_name,
    }));
  }

  async findById(invitationId: string): Promise<Invitation | null> {
    const row = await this.database
      .prepare(`SELECT ${COLUMNS} FROM invitations WHERE id = ?`)
      .bind(invitationId)
      .first<InvitationRow>();
    return row === null ? null : toInvitation(row);
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

  /**
   * La membresía solo se inserta si el `UPDATE` cerró la invitación (`changes() = 1`): si otra
   * respuesta llegó antes, no entra nadie. `ON CONFLICT` deja intacta una membresía existente.
   */
  async saveAccepted(accepted: Invitation, member: UserId, at: Date): Promise<void> {
    const timestamp = toIsoDate(at);
    await this.database.batch([
      this.database
        .prepare(
          `UPDATE invitations SET status = 'ACCEPTED', updated_at = ?
           WHERE id = ? AND status = 'PENDING'`,
        )
        .bind(timestamp, accepted.id),
      this.database
        .prepare(
          `INSERT INTO group_members (group_id, user_id, role, status, joined_at, updated_at)
           SELECT ?, ?, ?, 'ACTIVE', ?, ? WHERE changes() = 1
           ON CONFLICT (group_id, user_id) DO NOTHING`,
        )
        .bind(accepted.groupId.toString(), member.toString(), accepted.role, timestamp, timestamp),
    ]);
  }

  async saveDeclined(declined: Invitation, at: Date): Promise<void> {
    await this.database
      .prepare(
        `UPDATE invitations SET status = 'DECLINED', updated_at = ?
         WHERE id = ? AND status = 'PENDING'`,
      )
      .bind(toIsoDate(at), declined.id)
      .run();
  }
}
