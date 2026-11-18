import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { signal } from '@angular/core';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { CreateExpenseComponent } from './create-expense.component';
import { ExpensesService } from '../../../core/expenses/expenses.service';
import { GroupsService } from '../../../core/groups/groups.service';
import { CurrentProfileStore } from '../../../core/profile/current-profile.store';
import { ANA_PROFILE } from '../../../core/profile/profile.fixtures';
import { GroupMember, GroupSummary } from '../../../shared/api';

const CASA: GroupSummary = {
  id: 'grp_casa',
  name: 'Casa',
  description: null,
  defaultCurrency: 'COP',
  status: 'ACTIVE',
  role: 'MEMBER',
  createdAt: '2026-11-12T15:00:00.000Z',
  updatedAt: '2026-11-12T15:00:00.000Z',
};

function member(userId: string, displayName: string): GroupMember {
  return {
    userId,
    displayName,
    photoUrl: null,
    role: 'MEMBER',
    status: 'ACTIVE',
    joinedAt: '2026-11-12T15:00:00.000Z',
  };
}

interface Fakes {
  createExpense: ReturnType<typeof vi.fn>;
  navigate: ReturnType<typeof vi.fn<Router['navigate']>>;
}

/** `realBackend`: el ExpensesService de verdad, contra HttpTestingController. */
async function render(
  fakes: Fakes,
  realBackend = false,
): Promise<ComponentFixture<CreateExpenseComponent>> {
  TestBed.configureTestingModule({
    imports: [CreateExpenseComponent],
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ groupId: 'grp_casa' }) } },
      },
      {
        provide: GroupsService,
        useValue: {
          getGroup: () => Promise.resolve(CASA),
          listMembers: () =>
            Promise.resolve([member('usr_juan', 'Juan'), member('usr_ana', 'Ana Pérez')]),
        },
      },
      ...(realBackend
        ? [provideHttpClient(), provideHttpClientTesting()]
        : [{ provide: ExpensesService, useValue: { createExpense: fakes.createExpense } }]),
      {
        provide: CurrentProfileStore,
        useValue: { profile: signal(ANA_PROFILE), load: () => Promise.resolve() },
      },
    ],
  });
  vi.spyOn(TestBed.inject(Router), 'navigate').mockImplementation(fakes.navigate);
  const fixture = TestBed.createComponent(CreateExpenseComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

function input(fixture: ComponentFixture<CreateExpenseComponent>, name: string): HTMLInputElement {
  return (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
    `[formControlName="${name}"]`,
  )!;
}

function type(
  fixture: ComponentFixture<CreateExpenseComponent>,
  name: string,
  value: string,
): void {
  const element = input(fixture, name);
  element.value = value;
  element.dispatchEvent(new Event('input'));
  fixture.detectChanges();
}

async function submit(fixture: ComponentFixture<CreateExpenseComponent>): Promise<void> {
  (fixture.nativeElement as HTMLElement).querySelector('form')!.dispatchEvent(new Event('submit'));
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('CreateExpenseComponent', () => {
  let fakes: Fakes;

  beforeEach(() => {
    TestBed.resetTestingModule();
    // Solo la fecha: "hoy" es el 18 de noviembre (hora local), aunque en UTC ya sea otro día.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 18, 22, 30));
    fakes = {
      createExpense: vi.fn(() => Promise.resolve({ id: 'exp_1' })),
      navigate: vi.fn<Router['navigate']>(() => Promise.resolve(true)),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shouldSendAnEqualExpensePaidByMeAmongEveryActiveMemberAndGoBackToTheGroup', async () => {
    const fixture = await render(fakes);
    expect(input(fixture, 'expenseDate').value).toBe('2026-11-18');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('COP');

    type(fixture, 'title', '  Mercado  ');
    type(fixture, 'amount', '150000');
    type(fixture, 'description', 'Para la semana');
    await submit(fixture);

    expect(fakes.createExpense).toHaveBeenCalledWith(
      'grp_casa',
      {
        title: 'Mercado',
        description: 'Para la semana',
        paidBy: 'usr_ana',
        amount: '150000',
        currency: 'COP',
        expenseDate: '2026-11-18T00:00:00Z',
        split: {
          type: 'EQUAL',
          participants: [{ userId: 'usr_juan' }, { userId: 'usr_ana' }],
        },
      },
      expect.stringMatching(/^[0-9a-f-]{36}$/),
    );
    expect(fakes.navigate).toHaveBeenCalledWith(['/grupos', 'grp_casa']);
  });

  it('shouldSendACommaDecimalWithADotAndAnEmptyDescriptionAsNull', async () => {
    const fixture = await render(fakes);

    type(fixture, 'title', 'Taxi');
    type(fixture, 'amount', ' 33,34 ');
    await submit(fixture);

    expect(fakes.createExpense).toHaveBeenCalledWith(
      'grp_casa',
      expect.objectContaining({ amount: '33.34', description: null }),
      expect.any(String),
    );
  });

  it('shouldRetryWithTheSameIdempotencyKeyAndUseANewOneAfterAnEdit', async () => {
    fakes.createExpense
      .mockRejectedValueOnce(new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' }))
      .mockRejectedValueOnce(new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' }))
      .mockResolvedValueOnce({ id: 'exp_1' });
    const fixture = await render(fakes);
    type(fixture, 'title', 'Mercado');
    type(fixture, 'amount', '150000');

    await submit(fixture);
    await submit(fixture);
    type(fixture, 'amount', '160000');
    await submit(fixture);

    const keys = fakes.createExpense.mock.calls.map((call) => call[2] as string);
    expect(keys).toHaveLength(3);
    expect(keys[1]).toBe(keys[0]);
    expect(keys[2]).not.toBe(keys[0]);
    expect(fakes.navigate).toHaveBeenCalledTimes(1);
  });

  it('shouldShowTheBackendRejectionNextToTheTitleOrTheAmount', async () => {
    const fixture = await render(fakes, true);
    const http = TestBed.inject(HttpTestingController);
    const element = fixture.nativeElement as HTMLElement;
    const rejectWith = async (error: unknown): Promise<void> => {
      // Sin esperar a whenStable: el envío queda pendiente hasta que llegue la respuesta.
      element.querySelector('form')!.dispatchEvent(new Event('submit'));
      http
        .expectOne('/api/v1/groups/grp_casa/expenses')
        .flush({ error, meta: { requestId: 'req_1' } }, { status: 400, statusText: 'Bad Request' });
      await fixture.whenStable();
      fixture.detectChanges();
    };
    type(fixture, 'title', ' ');
    type(fixture, 'amount', '150000.50');

    await rejectWith({
      code: 'VALIDATION_ERROR',
      message: 'La solicitud contiene valores inválidos.',
      details: [{ field: 'title', reason: 'length_1_to_120' }],
    });
    expect(errorNextTo(element, 'title')).toBe('Debe tener entre 1 y 120 caracteres.');

    type(fixture, 'title', 'Mercado');
    await rejectWith({ code: 'INVALID_AMOUNT', message: 'El monto debe ser positivo.' });
    expect(errorNextTo(element, 'amount')).toBe(
      'Escribe un monto mayor que cero, sin decimales en COP.',
    );
    expect(fakes.navigate).not.toHaveBeenCalled();
    http.verify();
  });
});

function errorNextTo(element: HTMLElement, field: string): string {
  return (
    element
      .querySelector(`[formControlName="${field}"]`)
      ?.closest('mat-form-field')
      ?.querySelector('mat-error')
      ?.textContent?.trim() ?? ''
  );
}
