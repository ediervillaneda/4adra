import { MemberGroup } from '../../domain/group/GroupRepository';
import { GroupSummaryView } from './GroupSummaryView';

export function toGroupSummaryView({ group, role }: MemberGroup): GroupSummaryView {
  return {
    id: group.id.toString(),
    name: group.name,
    description: group.description,
    defaultCurrency: group.defaultCurrency,
    status: group.status,
    role,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
  };
}
