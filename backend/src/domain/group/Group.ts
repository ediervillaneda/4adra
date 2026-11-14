import { GroupId } from './GroupId';
import { NewGroup } from './NewGroup';
import { UserId } from '../user/UserId';

export type GroupStatus = 'ACTIVE' | 'ARCHIVED';

interface GroupProps {
  id: GroupId;
  name: string;
  description: string | null;
  defaultCurrency: string;
  status: GroupStatus;
  createdBy: UserId;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

/** Agregado raíz de un grupo de gastos compartidos (docs/domain/Group.md). */
export class Group {
  private constructor(private readonly props: GroupProps) {}

  /** Grupo recién creado a partir de datos ya validados (validateNewGroup). */
  static create(id: GroupId, data: NewGroup, createdBy: UserId, now: Date): Group {
    return new Group({
      id,
      ...data,
      status: 'ACTIVE',
      createdBy,
      createdAt: now,
      updatedAt: now,
      version: 1,
    });
  }

  /** Reconstruye un grupo persistido. */
  static restore(props: GroupProps): Group {
    return new Group(props);
  }

  get id(): GroupId {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string | null {
    return this.props.description;
  }

  get defaultCurrency(): string {
    return this.props.defaultCurrency;
  }

  get status(): GroupStatus {
    return this.props.status;
  }

  get createdBy(): UserId {
    return this.props.createdBy;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get version(): number {
    return this.props.version;
  }
}
