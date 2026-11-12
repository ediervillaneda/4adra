import { CreateGroupUseCase } from '../../src/application/group/CreateGroupUseCase';
import { ListMyGroupsUseCase } from '../../src/application/group/ListMyGroupsUseCase';
import { InMemoryGroupRepository } from './InMemoryGroupRepository';
import { InMemoryUserRepository } from './InMemoryUserRepository';

/** Casos de uso de grupos sobre repositorios en memoria, para armar AppDependencies en pruebas. */
export function inMemoryGroupUseCases(now: () => Date = () => new Date('2026-11-12T15:00:00Z')): {
  createGroupUseCase: CreateGroupUseCase;
  listMyGroupsUseCase: ListMyGroupsUseCase;
} {
  const groups = new InMemoryGroupRepository();
  let sequence = 0;
  return {
    createGroupUseCase: new CreateGroupUseCase(
      groups,
      new InMemoryUserRepository(),
      () => `grp_${String((sequence += 1))}`,
      now,
    ),
    listMyGroupsUseCase: new ListMyGroupsUseCase(groups),
  };
}
