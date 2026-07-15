import { AuditLogEntry } from './AuditLogEntry';

export interface AuditLogWriter {
  write(entry: AuditLogEntry): Promise<void>;
}
