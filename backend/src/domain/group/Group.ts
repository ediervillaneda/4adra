import {
  CalculationProfileRef,
  DEFAULT_CALCULATION_PROFILE,
} from '../calculation/CalculationProfile';
import { GroupId } from './GroupId';
import { GroupDetails } from './GroupDetails';
import { GroupArchivedException } from './errors';
import { NewGroup } from './NewGroup';
import { UserId } from '../user/UserId';

export type GroupStatus = 'ACTIVE' | 'ARCHIVED';

interface GroupProps {
  id: GroupId;
  name: string;
  description: string | null;
  defaultCurrency: string;
  status: GroupStatus;
  calculationProfile: CalculationProfileRef;
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
      calculationProfile: DEFAULT_CALCULATION_PROFILE,
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

  /** El mismo grupo con nombre y descripción nuevos (ya validados), una versión más y `updatedAt` nuevo. */
  withDetails(details: GroupDetails, now: Date): Group {
    return new Group({
      ...this.props,
      ...details,
      updatedAt: now,
      version: this.props.version + 1,
    });
  }

  /** El mismo grupo archivado, con una versión más y `updatedAt` nuevo. Es irreversible desde la app. */
  archive(now: Date): Group {
    return new Group({
      ...this.props,
      status: 'ARCHIVED',
      updatedAt: now,
      version: this.props.version + 1,
    });
  }

  /** Un grupo archivado es de solo lectura: cualquier cambio a él o a sus miembros se rechaza. */
  ensureActive(): void {
    if (this.props.status !== 'ACTIVE') {
      throw new GroupArchivedException();
    }
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

  /** Perfil activo: los gastos nuevos guardan esta versión. */
  get calculationProfile(): CalculationProfileRef {
    return this.props.calculationProfile;
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
