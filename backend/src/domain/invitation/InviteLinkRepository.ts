import { InviteLink } from './InviteLink';

/** Enlace vigente visto por quien lo abre: solo el nombre del grupo, nada más. */
export interface CurrentInviteLink {
  link: InviteLink;
  groupName: string;
}

export interface InviteLinkRepository {
  /** En una sola operación atómica: marca como reemplazado el enlace anterior del grupo y guarda este. */
  replaceForGroup(link: InviteLink): Promise<void>;
  /** El enlace con ese hash, si no fue reemplazado y su grupo sigue activo (vencido o no); si no, `null`. */
  findCurrentByCodeHash(codeHash: string): Promise<CurrentInviteLink | null>;
}
