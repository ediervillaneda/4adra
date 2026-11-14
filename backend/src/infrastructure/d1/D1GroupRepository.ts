import { Group, GroupStatus } from '../../domain/group/Group';
import { GroupId } from '../../domain/group/GroupId';
import {
  GroupMember,
  GroupMembership,
  GroupRepository,
  MemberGroup,
} from '../../domain/group/GroupRepository';
import { MemberRole } from '../../domain/group/MemberRole';
import { Email } from '../../domain/user/Email';
import { UserId } from '../../domain/user/UserId';
import { fromIsoDate, toIsoDate } from './isoDate';

interface MemberGroupRow {
  id: string;
  name: string;
  description: string | null;
  default_currency: string;
  status: GroupStatus;
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  role: MemberRole;
}

interface GroupMemberRow {
  user_id: string;
  display_name: string;
  photo_url: string | null;
  role: MemberRole;
  joined_at: string;
}

function fromRow(row: MemberGroupRow): MemberGroup {
  return {
    group: Group.restore({
      id: GroupId.fromString(row.id),
      name: row.name,
      description: row.description,
      defaultCurrency: row.default_currency,
      status: row.status,
      createdBy: UserId.fromString(row.created_by),
      createdAt: fromIsoDate(row.created_at),
      updatedAt: fromIsoDate(row.updated_at),
      version: row.version,
    }),
    role: row.role,
  };
}

export class D1GroupRepository implements GroupRepository {
  constructor(private readonly database: D1Database) {}

  async createWithOwner(group: Group): Promise<void> {
    const createdAt = toIsoDate(group.createdAt);
    await this.database.batch([
      this.database
        .prepare(
          `INSERT INTO groups (id, name, description, default_currency, status, version, created_by, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          group.id.toString(),
          group.name,
          group.description,
          group.defaultCurrency,
          group.status,
          group.version,
          group.createdBy.toString(),
          createdAt,
          toIsoDate(group.updatedAt),
        ),
      this.database
        .prepare(
          `INSERT INTO group_members (group_id, user_id, role, status, joined_at, updated_at)
           VALUES (?, ?, 'OWNER', 'ACTIVE', ?, ?)`,
        )
        .bind(group.id.toString(), group.createdBy.toString(), createdAt, createdAt),
    ]);
  }

  async listForMember(userId: UserId): Promise<MemberGroup[]> {
    const { results } = await this.database
      .prepare(
        `SELECT g.*, m.role FROM groups g
         JOIN group_members m ON m.group_id = g.id
         WHERE m.user_id = ? AND m.status = 'ACTIVE'
         ORDER BY g.updated_at DESC, g.id`,
      )
      .bind(userId.toString())
      .all<MemberGroupRow>();
    return results.map(fromRow);
  }

  async findForMember(groupId: GroupId, userId: UserId): Promise<MemberGroup | null> {
    const row = await this.database
      .prepare(
        `SELECT g.*, m.role FROM groups g
         JOIN group_members m ON m.group_id = g.id
         WHERE g.id = ? AND m.user_id = ? AND m.status = 'ACTIVE'`,
      )
      .bind(groupId.toString(), userId.toString())
      .first<MemberGroupRow>();
    return row === null ? null : fromRow(row);
  }

  async listActiveMembers(groupId: GroupId): Promise<GroupMember[]> {
    const { results } = await this.database
      .prepare(
        `SELECT m.user_id, u.display_name, u.photo_url, m.role, m.joined_at FROM group_members m
         JOIN users u ON u.id = m.user_id
         WHERE m.group_id = ? AND m.status = 'ACTIVE'`,
      )
      .bind(groupId.toString())
      .all<GroupMemberRow>();
    return results.map((row) => ({
      userId: UserId.fromString(row.user_id),
      displayName: row.display_name,
      photoUrl: row.photo_url,
      role: row.role,
      joinedAt: fromIsoDate(row.joined_at),
    }));
  }

  async hasActiveMemberWithEmail(groupId: GroupId, email: Email): Promise<boolean> {
    const row = await this.database
      .prepare(
        `SELECT 1 AS found FROM group_members m
         JOIN users u ON u.id = m.user_id
         WHERE m.group_id = ? AND m.status = 'ACTIVE' AND lower(u.email) = ?`,
      )
      .bind(groupId.toString(), email.toString())
      .first();
    return row !== null;
  }

  async addMemberIfAbsent(
    groupId: GroupId,
    userId: UserId,
    role: MemberRole,
    at: Date,
  ): Promise<GroupMembership> {
    const timestamp = toIsoDate(at);
    const [, selected] = await this.database.batch<{ role: MemberRole; joined_at: string }>([
      this.database
        .prepare(
          `INSERT INTO group_members (group_id, user_id, role, status, joined_at, updated_at)
           VALUES (?, ?, ?, 'ACTIVE', ?, ?)
           ON CONFLICT (group_id, user_id) DO NOTHING`,
        )
        .bind(groupId.toString(), userId.toString(), role, timestamp, timestamp),
      this.database
        .prepare('SELECT role, joined_at FROM group_members WHERE group_id = ? AND user_id = ?')
        .bind(groupId.toString(), userId.toString()),
    ]);
    const row = selected?.results[0] as { role: MemberRole; joined_at: string };
    return { role: row.role, joinedAt: fromIsoDate(row.joined_at) };
  }
}
