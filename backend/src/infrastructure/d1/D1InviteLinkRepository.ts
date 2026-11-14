import { GroupId } from '../../domain/group/GroupId';
import { InviteLink } from '../../domain/invitation/InviteLink';
import {
  CurrentInviteLink,
  InviteLinkRepository,
} from '../../domain/invitation/InviteLinkRepository';
import { UserId } from '../../domain/user/UserId';
import { fromIsoDate, toIsoDate } from './isoDate';

interface CurrentInviteLinkRow {
  id: string;
  group_id: string;
  code_hash: string;
  created_by: string;
  created_at: string;
  expires_at: string;
  group_name: string;
}

export class D1InviteLinkRepository implements InviteLinkRepository {
  constructor(private readonly database: D1Database) {}

  async replaceForGroup(link: InviteLink): Promise<void> {
    const createdAt = toIsoDate(link.createdAt);
    await this.database.batch([
      this.database
        .prepare(
          `UPDATE invite_links SET replaced_at = ?
           WHERE group_id = ? AND replaced_at IS NULL`,
        )
        .bind(createdAt, link.groupId.toString()),
      this.database
        .prepare(
          `INSERT INTO invite_links (id, group_id, code_hash, created_by, created_at, expires_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          link.id,
          link.groupId.toString(),
          link.codeHash,
          link.createdBy.toString(),
          createdAt,
          toIsoDate(link.expiresAt),
        ),
    ]);
  }

  async findCurrentByCodeHash(codeHash: string): Promise<CurrentInviteLink | null> {
    const row = await this.database
      .prepare(
        `SELECT l.id, l.group_id, l.code_hash, l.created_by, l.created_at, l.expires_at,
                g.name AS group_name
         FROM invite_links l
         JOIN groups g ON g.id = l.group_id
         WHERE l.code_hash = ? AND l.replaced_at IS NULL AND g.status = 'ACTIVE'`,
      )
      .bind(codeHash)
      .first<CurrentInviteLinkRow>();
    if (row === null) {
      return null;
    }
    return {
      link: InviteLink.restore({
        id: row.id,
        groupId: GroupId.fromString(row.group_id),
        codeHash: row.code_hash,
        createdBy: UserId.fromString(row.created_by),
        createdAt: fromIsoDate(row.created_at),
        expiresAt: fromIsoDate(row.expires_at),
      }),
      groupName: row.group_name,
    };
  }
}
