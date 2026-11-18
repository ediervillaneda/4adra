import { Money } from '../money/Money';
import { UserId } from '../user/UserId';

/** La parte de un gasto que consume un participante. */
export interface SplitShare {
  userId: UserId;
  amount: Money;
}

/**
 * Reparto en partes iguales (docs/Algorithms.md § Equal Split): las partes suman exactamente el
 * monto y el sobrante se asigna en orden de `UserId` ascendente, para que sea determinista.
 */
export class EqualSplitStrategy {
  split(amount: Money, participants: readonly UserId[]): SplitShare[] {
    const ordered = [...participants].sort((a, b) => compareUserIds(a, b));
    const amounts = amount.allocateEqually(ordered.length);
    return ordered.map((userId, index) => ({ userId, amount: amounts[index] as Money }));
  }
}

/** Orden por código (no por idioma), para que no dependa de la configuración regional. Los
 *  participantes nunca se repiten (validateNewExpense), así que no hay empates. */
function compareUserIds(a: UserId, b: UserId): number {
  return a.toString() < b.toString() ? -1 : 1;
}
