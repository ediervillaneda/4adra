import { Firestore, FieldValue } from 'firebase-admin/firestore';
import { AuditLogWriter } from '../../domain/audit/AuditLogWriter';
import { AuditLogEntry } from '../../domain/audit/AuditLogEntry';

const COLLECTION = 'auditLogs';

export class FirestoreAuditLogWriter implements AuditLogWriter {
  constructor(private readonly firestore: Firestore) {}

  async write(entry: AuditLogEntry): Promise<void> {
    await this.firestore.collection(COLLECTION).add({
      actorId: entry.actorId,
      entity: entry.entity,
      entityId: entry.entityId,
      operation: entry.operation,
      requestId: entry.requestId,
      occurredAt: entry.occurredAt,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
}
