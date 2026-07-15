import { FirestoreAuditLogWriter } from '../../../../src/infrastructure/audit/FirestoreAuditLogWriter';

describe('FirestoreAuditLogWriter', () => {
  it('shouldAddADocumentToTheAuditLogsCollection', async () => {
    const add = jest.fn().mockResolvedValue({ id: 'log_1' });
    const collection = jest.fn().mockReturnValue({ add });
    const firestore = { collection } as never;
    const writer = new FirestoreAuditLogWriter(firestore);
    const entry = {
      actorId: 'usr_ana',
      entity: '/v1/groups',
      entityId: '/v1/groups',
      operation: 'POST',
      requestId: 'req_123',
      occurredAt: new Date('2026-07-13T12:00:00Z'),
    };

    await writer.write(entry);

    expect(collection).toHaveBeenCalledWith('auditLogs');
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ actorId: 'usr_ana', operation: 'POST' }));
  });
});
