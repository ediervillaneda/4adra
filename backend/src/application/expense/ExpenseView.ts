import { Expense } from '../../domain/expense/Expense';

/** Un gasto tal como lo devuelve la API (schema Expense de docs/api/openapi.yaml). */
export interface ExpenseView {
  id: string;
  groupId: string;
  title: string;
  description: string | null;
  paidBy: string;
  originalAmount: string;
  currency: string;
  exchangeRate: string;
  convertedAmount: string;
  calculationProfileVersion: number;
  expenseDate: string;
  split: { type: 'EQUAL'; participants: { userId: string; amount: string }[] };
  status: string;
  resourceVersion: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export function toExpenseView(expense: Expense): ExpenseView {
  const amount = expense.amount.toString();
  return {
    id: expense.id.toString(),
    groupId: expense.groupId.toString(),
    title: expense.title,
    description: expense.description,
    paidBy: expense.paidBy.toString(),
    originalAmount: amount,
    currency: expense.amount.currency,
    exchangeRate: expense.exchangeRate,
    // Sin multimoneda todavía: el monto convertido a la moneda base es el original (tasa 1).
    convertedAmount: amount,
    calculationProfileVersion: expense.calculationProfile.version,
    expenseDate: expense.expenseDate.toISOString(),
    split: {
      type: 'EQUAL',
      participants: expense.shares.map((share) => ({
        userId: share.userId.toString(),
        amount: share.amount.toString(),
      })),
    },
    status: expense.status,
    resourceVersion: expense.version,
    createdBy: expense.createdBy.toString(),
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  };
}
