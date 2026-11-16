import { Group, GroupStatus } from '../../domain/group/Group';
import { GroupId } from '../../domain/group/GroupId';
import {
  GroupMember,
  GroupMembership,
  GroupRepository,
  MemberGroup,
  RoleChangeResult,
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

/** Rol del actor y Owners activos, para explicar un cambio de rol que no se aplicó. */
interface RoleChangeContextRow {
  actor_role: MemberRole | null;
  active_owners: number;
}

function toGroupMember(row: GroupMemberRow): GroupMember {
  return {
    userId: UserId.fromString(row.user_id),
    displayName: row.display_name,
    photoUrl: row.photo_url,
    role: row.role,
    joinedAt: fromIsoDate(row.joined_at),
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
    return results.map(toGroupMember);
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

  async changeMemberRole(
    groupId: GroupId,
    actorId: UserId,
    userId: UserId,
    role: MemberRole,
    at: Date,
  ): Promise<RoleChangeResult> {
    const group = groupId.toString();
    const [updated, selected, context] = await this.database.batch<
      GroupMemberRow & RoleChangeContextRow
    >([
      // Las dos condiciones van en la misma sentencia (D1 serializa las escrituras): el actor sigue
      // siendo Owner activo y, si se degrada a un Owner, queda al menos otro.
      this.database
        .prepare(
          `UPDATE group_members SET role = ?, updated_at = ?
           WHERE group_id = ? AND user_id = ? AND status = 'ACTIVE'
             AND EXISTS (SELECT 1 FROM group_members
                         WHERE group_id = ? AND user_id = ? AND role = 'OWNER' AND status = 'ACTIVE')
             AND (? = 'OWNER' OR role <> 'OWNER'
                  OR (SELECT COUNT(*) FROM group_members
                      WHERE group_id = ? AND role = 'OWNER' AND status = 'ACTIVE') > 1)`,
        )
        .bind(
          role,
          toIsoDate(at),
          group,
          userId.toString(),
          group,
          actorId.toString(),
          role,
          group,
        ),
      this.database
        .prepare(
          `SELECT m.user_id, u.display_name, u.photo_url, m.role, m.joined_at FROM group_members m
           JOIN users u ON u.id = m.user_id
           WHERE m.group_id = ? AND m.user_id = ? AND m.status = 'ACTIVE'`,
        )
        .bind(group, userId.toString()),
      // Lo que explica un UPDATE sin cambios, leído en la misma transacción.
      this.database
        .prepare(
          `SELECT
             (SELECT role FROM group_members
              WHERE group_id = ? AND user_id = ? AND status = 'ACTIVE') AS actor_role,
             (SELECT COUNT(*) FROM group_members
              WHERE group_id = ? AND role = 'OWNER' AND status = 'ACTIVE') AS active_owners`,
        )
        .bind(group, actorId.toString(), group),
    ]);
    const row = selected?.results[0];
    if (updated?.meta.changes !== 0 && row !== undefined) {
      return { status: 'CHANGED', member: toGroupMember(row) };
    }
    const facts = context?.results[0];
    if (facts?.actor_role !== 'OWNER') {
      return { status: 'PERMISSION_DENIED' };
    }
    if (row === undefined) {
      return { status: 'MEMBER_NOT_FOUND' };
    }
    if (row.role === 'OWNER' && role !== 'OWNER' && facts.active_owners <= 1) {
      return { status: 'LAST_OWNER' };
    }
    throw new Error('El cambio de rol no se aplicó por un motivo no previsto.');
  }
}
