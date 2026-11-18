import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiErrorEnvelope, ApiSuccessEnvelope, Expense, NewExpenseRequest } from '../../shared/api';
import { TEXTS } from '../../shared/texts';

/** El backend rechazó campos del gasto; los mensajes ya están en español, por campo del formulario. */
export class ExpenseValidationError extends Error {
  constructor(readonly fieldErrors: Record<string, string>) {
    super('VALIDATION_ERROR');
  }
}

/** Mensaje por `reason` de VALIDATION_ERROR (los de grupos más los propios del gasto). */
function messageFor(reason: string | undefined): string {
  if (reason === 'must_be_day_at_midnight_utc') {
    return TEXTS.expenses.invalidDate;
  }
  return TEXTS.groups.errors[reason ?? 'unknown'] ?? TEXTS.groups.errors['unknown'];
}

/** Un 400 de campos (VALIDATION_ERROR, INVALID_AMOUNT) pasa a ExpenseValidationError; el resto, tal cual. */
function toExpenseValidationError(error: unknown, currency: string): unknown {
  const body =
    error instanceof HttpErrorResponse && error.status === 400
      ? (error.error as Partial<ApiErrorEnvelope> | null)
      : null;
  if (body?.error?.code === 'INVALID_AMOUNT') {
    return new ExpenseValidationError({ amount: TEXTS.expenses.invalidAmount(currency) });
  }
  if (body?.error?.code !== 'VALIDATION_ERROR') {
    return error;
  }
  const fieldErrors: Record<string, string> = {};
  for (const detail of body.error.details ?? []) {
    if (detail.field) {
      fieldErrors[detail.field] = messageFor(detail.reason);
    }
  }
  return new ExpenseValidationError(fieldErrors);
}

/** Gastos de un grupo (docs/api/Expenses.md). El backend reparte y valida; aquí solo se pide. */
@Injectable({ providedIn: 'root' })
export class ExpensesService {
  private readonly http = inject(HttpClient);

  /** Gastos activos, del más reciente al más antiguo (el orden lo da el backend). */
  async listExpenses(groupId: string): Promise<Expense[]> {
    const response = await firstValueFrom(
      this.http.get<ApiSuccessEnvelope<Expense[]>>(
        `/api/v1/groups/${encodeURIComponent(groupId)}/expenses`,
      ),
    );
    return response.data;
  }

  /**
   * Registra un gasto. La misma `idempotencyKey` en un reintento devuelve el gasto ya creado en
   * vez de duplicarlo (docs/api/Expenses.md).
   */
  async createExpense(
    groupId: string,
    request: NewExpenseRequest,
    idempotencyKey: string,
  ): Promise<Expense> {
    try {
      const response = await firstValueFrom(
        this.http.post<ApiSuccessEnvelope<Expense>>(
          `/api/v1/groups/${encodeURIComponent(groupId)}/expenses`,
          request,
          { headers: new HttpHeaders({ 'Idempotency-Key': idempotencyKey }) },
        ),
      );
      return response.data;
    } catch (error) {
      throw toExpenseValidationError(error, request.currency);
    }
  }
}
