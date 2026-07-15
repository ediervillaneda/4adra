export interface AuditLogEntry {
  readonly actorId: string;
  readonly entity: string;
  readonly entityId: string;
  readonly operation: string;
  readonly requestId: string;
  readonly occurredAt: Date;
}
