import { MemberRole } from '../../shared/api';

/**
 * Si un rol puede editar el nombre y la descripción del grupo (matriz en docs/Security.md). Solo
 * decide qué se muestra: el backend vuelve a validarlo al guardar.
 */
export function canEditGroup(role: MemberRole): boolean {
  return role === 'OWNER' || role === 'ADMINISTRATOR';
}

/**
 * Si un rol puede registrar gastos en un grupo activo: Owner, Administrator y Member; ReadOnly solo
 * consulta (docs/Security.md). Solo decide qué se muestra: el backend vuelve a validarlo.
 */
export function canWriteExpenses(group: { role: MemberRole; status: string }): boolean {
  return group.status === 'ACTIVE' && group.role !== 'READ_ONLY';
}
