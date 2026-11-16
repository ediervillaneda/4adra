import { Group, GroupStatus } from '../../domain/group/Group';
import { GroupId } from '../../domain/group/GroupId';
import {
  GroupMember,
  GroupMembership,
  GroupRepository,
  LeaveGroupResult,
  MemberGroup,
  MemberRemovalResult,
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
  status: 'ACTIVE' | 'REMOVED';
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

/**
 * Condición de un `UPDATE … WHERE` sobre `group_members`: la fila no es de un Owner, o el grupo
 * tiene más de un Owner activo. Así, degradar o sacar a esa persona nunca deja el grupo sin Owner.
 * La comparten cambiar rol y salir del grupo, y va en la misma sentencia que la escritura.
 */
const KEEPS_AN_ACTIVE_OWNER = `(group_members.role <> 'OWNER'
  OR (SELECT COUNT(*) FROM group_members owners
      WHERE owners.group_id = group_members.group_id
        AND owners.role = 'OWNER' AND owners.status = 'ACTIVE') > 1)`;

function toGroupMember(row: GroupMemberRow): GroupMember {
  return {
    userId: UserId.fromString(row.user_id),
    displayName: row.display_name,
    photoUrl: row.photo_url,
    role: row.role,
    status: row.status,
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
        `SELECT m.user_id, u.display_name, u.photo_url, m.role, m.status, m.joined_at FROM group_members m
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
           ON CONFLICT (group_id, user_id) DO UPDATE SET
             role = excluded.role, status = 'ACTIVE',
             joined_at = excluded.joined_at, updated_at = excluded.updated_at
           WHERE group_members.status = 'REMOVED'`,
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
             AND (? = 'OWNER' OR ${KEEPS_AN_ACTIVE_OWNER})`,
        )
        .bind(role, toIsoDate(at), group, userId.toString(), group, actorId.toString(), role),
      this.database
        .prepare(
          `SELECT m.user_id, u.display_name, u.photo_url, m.role, m.status, m.joined_at FROM group_members m
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
    if (updated?.meta.changes === 1 && row !== undefined) {
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

  async removeMember(
    groupId: GroupId,
    actorId: UserId,
    userId: UserId,
    at: Date,
  ): Promise<MemberRemovalResult> {
    const group = groupId.toString();
    const [updated, selected] = await this.database.batch<GroupMemberRow>([
      // El permiso del actor (canRemove) se vuelve a evaluar en la misma sentencia: D1 serializa
      // las escrituras, así que un actor degradado o removido a mitad de camino no remueve a nadie.
      this.database
        .prepare(
          `UPDATE group_members SET status = 'REMOVED', updated_at = ?
           WHERE group_id = ? AND user_id = ? AND status = 'ACTIVE' AND user_id <> ?
             AND EXISTS (SELECT 1 FROM group_members actor
                         WHERE actor.group_id = ? AND actor.user_id = ? AND actor.status = 'ACTIVE'
                           AND (actor.role = 'OWNER'
                                OR (actor.role = 'ADMINISTRATOR'
                                    AND group_members.role IN ('MEMBER', 'READ_ONLY'))))`,
        )
        .bind(
          toIsoDate(at),
          group,
          userId.toString(),
          actorId.toString(),
          group,
          actorId.toString(),
        ),
      this.database
        .prepare(
          `SELECT m.user_id, u.display_name, u.photo_url, m.role, m.status, m.joined_at
           FROM group_members m JOIN users u ON u.id = m.user_id
           WHERE m.group_id = ? AND m.user_id = ?`,
        )
        .bind(group, userId.toString()),
    ]);
    const row = selected?.results[0];
    if (updated?.meta.changes === 1 && row !== undefined) {
      return { status: 'REMOVED', member: toGroupMember(row) };
    }
    // Sin cambios: o la persona no es miembro activo, o el actor no puede removerla.
    return row?.status === 'ACTIVE'
      ? { status: 'PERMISSION_DENIED' }
      : { status: 'MEMBER_NOT_FOUND' };
  }

  async leaveGroup(groupId: GroupId, userId: UserId, at: Date): Promise<LeaveGroupResult> {
    const group = groupId.toString();
    const [updated, selected, owners] = await this.database.batch<
      GroupMemberRow & { active_owners: number }
    >([
      // La condición del último Owner va en la misma sentencia: dos Owners que salen a la vez no
      // dejan el grupo sin ninguno.
      this.database
        .prepare(
          `UPDATE group_members SET status = 'REMOVED', updated_at = ?
           WHERE group_id = ? AND user_id = ? AND status = 'ACTIVE' AND ${KEEPS_AN_ACTIVE_OWNER}`,
        )
        .bind(toIsoDate(at), group, userId.toString()),
      this.database
        .prepare(
          `SELECT m.user_id, u.display_name, u.photo_url, m.role, m.status, m.joined_at
           FROM group_members m JOIN users u ON u.id = m.user_id
           WHERE m.group_id = ? AND m.user_id = ?`,
        )
        .bind(group, userId.toString()),
      // Lo que explica un UPDATE sin cambios, leído en la misma transacción.
      this.database
        .prepare(
          `SELECT COUNT(*) AS active_owners FROM group_members
           WHERE group_id = ? AND role = 'OWNER' AND status = 'ACTIVE'`,
        )
        .bind(group),
    ]);
    const row = selected?.results[0];
    if (updated?.meta.changes === 1 && row !== undefined) {
      return { status: 'LEFT', member: toGroupMember(row) };
    }
    if (row?.status !== 'ACTIVE') {
      return { status: 'NOT_MEMBER' };
    }
    const activeOwners = owners?.results[0]?.active_owners ?? 0;
    if (row.role === 'OWNER' && activeOwners <= 1) {
      return { status: 'LAST_OWNER' };
    }
    throw new Error('La salida del grupo no se aplicó por un motivo no previsto.');
  }
}
