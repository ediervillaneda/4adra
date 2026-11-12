import { AuditLogWriter } from '../../domain/audit/AuditLogWriter';
import { AuditLogEntry } from '../../domain/audit/AuditLogEntry';
import { toIsoDate } from './isoDate';

/** Escribe en `audit_logs`, tabla de solo inserción protegida por triggers (ADR-006). */
export class D1AuditLogWriter implements AuditLogWriter {
  constructor(
    private readonly database: D1Database,
    private readonly generateId: () => string,
  ) {}

  async write(entry: AuditLogEntry): Promise<void> {
    await this.database
      .prepare(
        `INSERT INTO audit_logs (id, actor_id, entity, entity_id, operation, request_id, occurred_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        this.generateId(),
        entry.actorId,
        entry.entity,
        entry.entityId,
        entry.operation,
        entry.requestId,
        toIsoDate(entry.occurredAt),
      )
      .run();
  }
}
