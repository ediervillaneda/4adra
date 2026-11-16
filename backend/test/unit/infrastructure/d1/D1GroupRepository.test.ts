import { describe, it, expect } from 'vitest';
import { D1GroupRepository } from '../../../../src/infrastructure/d1/D1GroupRepository';
import { GroupId } from '../../../../src/domain/group/GroupId';
import { UserId } from '../../../../src/domain/user/UserId';

const JUAN_ACTIVE = {
  user_id: 'usr_juan',
  display_name: 'Juan',
  photo_url: null,
  role: 'MEMBER',
  joined_at: '2026-11-12T15:00:00.000Z',
  status: 'ACTIVE',
};

/** D1 falsa cuyo `batch` responde lo indicado: el `UPDATE` llega sin decir cuántas filas cambió. */
function databaseAnswering(results: unknown[]): D1Database {
  const statement = { bind: (): unknown => statement };
  return {
    prepare: () => statement,
    batch: () => Promise.resolve(results),
  } as unknown as D1Database;
}

const casa = GroupId.fromString('grp_casa');
const ana = UserId.fromString('usr_ana');
const juan = UserId.fromString('usr_juan');
const AT = new Date('2026-11-14T09:00:00.000Z');

describe('D1GroupRepository sin confirmación del UPDATE', () => {
  it('removeMemberShouldNotReportRemovedWhenUpdateDoesNotConfirmAChange', async () => {
    const repository = new D1GroupRepository(
      databaseAnswering([{ meta: {} }, { results: [JUAN_ACTIVE] }]),
    );

    const result = await repository.removeMember(casa, ana, juan, AT);

    expect(result.status).not.toBe('REMOVED');
  });

  it('changeMemberRoleShouldNotReportChangedWhenUpdateDoesNotConfirmAChange', async () => {
    const repository = new D1GroupRepository(
      databaseAnswering([
        { meta: {} },
        { results: [JUAN_ACTIVE] },
        { results: [{ actor_role: 'OWNER', active_owners: 1 }] },
      ]),
    );

    const outcome = await repository
      .changeMemberRole(casa, ana, juan, 'ADMINISTRATOR', AT)
      .then((result) => result.status)
      .catch(() => 'REJECTED');

    expect(outcome).not.toBe('CHANGED');
  });
});
