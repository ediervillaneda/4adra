import { GroupStatus } from '../../domain/group/Group';
import { MemberRole } from '../../domain/group/MemberRole';

export interface GroupSummaryView {
  id: string;
  name: string;
  description: string | null;
  defaultCurrency: string;
  status: GroupStatus;
  role: MemberRole;
  createdAt: string;
  updatedAt: string;
}
