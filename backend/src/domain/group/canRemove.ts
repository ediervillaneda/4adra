import { MemberRole } from './MemberRole';

/**
 * Si un miembro con `actorRole` puede remover a uno con `targetRole` (matriz en docs/Security.md):
 * el Owner, a cualquiera; el Administrator, solo a Member y ReadOnly. Removerse a sí mismo no
 * pasa por aquí: siempre se rechaza (para eso está salir del grupo).
 */
export function canRemove(actorRole: MemberRole, targetRole: MemberRole): boolean {
  if (actorRole === 'OWNER') {
    return true;
  }
  return actorRole === 'ADMINISTRATOR' && (targetRole === 'MEMBER' || targetRole === 'READ_ONLY');
}
