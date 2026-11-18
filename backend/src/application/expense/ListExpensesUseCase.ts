import { AuthenticatedActor } from '../../domain/auth/AuthenticatedActor';
import { ExpenseRepository } from '../../domain/expense/ExpenseRepository';
import { GroupNotFoundException } from '../../domain/group/errors';
import { GroupId } from '../../domain/group/GroupId';
import { GroupRepository } from '../../domain/group/GroupRepository';
import { ExpenseView, toExpenseView } from './ExpenseView';

/**
 * Gastos activos del grupo, del más reciente al más antiguo, para cualquier miembro activo
 * (también ReadOnly y en un grupo archivado). Por ahora sin filtros ni paginación.
 */
export class ListExpensesUseCase {
  constructor(
    private readonly groupRepository: GroupRepository,
    private readonly expenseRepository: ExpenseRepository,
  ) {}

  async execute(command: { actor: AuthenticatedActor; groupId: string }): Promise<ExpenseView[]> {
    const groupId = GroupId.fromString(command.groupId);
    if ((await this.groupRepository.findForMember(groupId, command.actor.userId)) === null) {
      throw new GroupNotFoundException();
    }
    return (await this.expenseRepository.listActive(groupId)).map(toExpenseView);
  }
}
