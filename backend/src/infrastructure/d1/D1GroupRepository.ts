import { Group, GroupStatus } from '../../domain/group/Group';
import { GroupId } from '../../domain/group/GroupId';
import { GroupRepository, MemberGroup } from '../../domain/group/GroupRepository';
import { MemberRole } from '../../domain/group/MemberRole';
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
}
