import { CalculationProfileRef } from '../calculation/CalculationProfile';
import { GroupId } from '../group/GroupId';
import { Money } from '../money/Money';
import { UserId } from '../user/UserId';
import { EqualSplitStrategy, SplitShare } from './EqualSplitStrategy';
import { ExpenseId } from './ExpenseId';
import { NewExpense } from './NewExpense';

export type ExpenseStatus = 'ACTIVE' | 'DELETED';

export interface ExpenseProps {
  id: ExpenseId;
  groupId: GroupId;
  title: string;
  description: string | null;
  paidBy: UserId;
  amount: Money;
  exchangeRate: string;
  expenseDate: Date;
  shares: SplitShare[];
  calculationProfile: CalculationProfileRef;
  status: ExpenseStatus;
  version: number;
  createdBy: UserId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Un pago de un único miembro dentro de un grupo, con su reparto ya resuelto (docs/domain/Expense.md).
 * Por ahora todo gasto va en la moneda base del grupo: tasa 1 y monto convertido igual al original.
 */
export class Expense {
  private constructor(private readonly props: ExpenseProps) {}

  static create(
    id: ExpenseId,
    groupId: GroupId,
    data: NewExpense,
    calculationProfile: CalculationProfileRef,
    createdBy: UserId,
    now: Date,
  ): Expense {
    return new Expense({
      id,
      groupId,
      title: data.title,
      description: data.description,
      paidBy: data.paidBy,
      amount: data.amount,
      exchangeRate: '1',
      expenseDate: data.expenseDate,
      shares: new EqualSplitStrategy().split(data.amount, data.participants),
      calculationProfile,
      status: 'ACTIVE',
      version: 1,
      createdBy,
      createdAt: now,
      updatedAt: now,
    });
  }

  /** Reconstruye un gasto persistido. */
  static restore(props: ExpenseProps): Expense {
    return new Expense(props);
  }

  get id(): ExpenseId {
    return this.props.id;
  }

  get groupId(): GroupId {
    return this.props.groupId;
  }

  get title(): string {
    return this.props.title;
  }

  get description(): string | null {
    return this.props.description;
  }

  get paidBy(): UserId {
    return this.props.paidBy;
  }

  get amount(): Money {
    return this.props.amount;
  }

  get exchangeRate(): string {
    return this.props.exchangeRate;
  }

  get expenseDate(): Date {
    return this.props.expenseDate;
  }

  get shares(): readonly SplitShare[] {
    return this.props.shares;
  }

  get calculationProfile(): CalculationProfileRef {
    return this.props.calculationProfile;
  }

  get status(): ExpenseStatus {
    return this.props.status;
  }

  get version(): number {
    return this.props.version;
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
}
