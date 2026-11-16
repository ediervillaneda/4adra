import { MemberRole } from '../../shared/api';

/**
 * Si un rol puede editar el nombre y la descripción del grupo (matriz en docs/Security.md). Solo
 * decide qué se muestra: el backend vuelve a validarlo al guardar.
 */
export function canEditGroup(role: MemberRole): boolean {
  return role === 'OWNER' || role === 'ADMINISTRATOR';
}
