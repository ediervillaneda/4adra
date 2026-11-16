import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { EditGroupComponent } from './edit-group.component';

const CASA = {
  id: 'grp_casa',
  name: 'Casa compartida',
  description: 'Arriendo y servicios',
  defaultCurrency: 'COP',
  status: 'ACTIVE',
  role: 'OWNER',
  createdAt: '2026-11-12T15:00:00.000Z',
  updatedAt: '2026-11-12T15:00:00.000Z',
};
const META = { meta: { requestId: 'req_1' } };

let http: HttpTestingController;

async function renderAs(role: string): Promise<ComponentFixture<EditGroupComponent>> {
  TestBed.configureTestingModule({
    imports: [EditGroupComponent],
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ groupId: 'grp_casa' }) } },
      },
    ],
  });
  http = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(EditGroupComponent);
  fixture.detectChanges();
  http.expectOne('/api/v1/groups/grp_casa').flush({ data: { ...CASA, role }, ...META });
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

function input(fixture: ComponentFixture<EditGroupComponent>, name: string): HTMLInputElement {
  return (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
    `[formControlName="${name}"]`,
  ) as HTMLInputElement;
}

function type(fixture: ComponentFixture<EditGroupComponent>, name: string, value: string): void {
  const element = input(fixture, name);
  element.value = value;
  element.dispatchEvent(new Event('input'));
  fixture.detectChanges();
}

function save(fixture: ComponentFixture<EditGroupComponent>): void {
  (fixture.nativeElement as HTMLElement)
    .querySelector<HTMLButtonElement>('[data-testid="save-group"]')
    ?.click();
}

describe('EditGroupComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    http.verify();
  });

  it('editGroupShouldPrefillNameAndDescriptionAndShowTheCurrencyReadOnly', async () => {
    const fixture = await renderAs('ADMINISTRATOR');
    const element = fixture.nativeElement as HTMLElement;

    expect(input(fixture, 'name').value).toBe('Casa compartida');
    expect(input(fixture, 'description').value).toBe('Arriendo y servicios');
    expect(element.querySelector('[data-testid="group-currency"]')?.textContent).toContain('COP');
    expect(element.querySelector('[formControlName="defaultCurrency"]')).toBeNull();
  });

  it('editGroupShouldSaveAndGoBackToTheDetail', async () => {
    const fixture = await renderAs('OWNER');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    type(fixture, 'name', '  Casa de la playa ');
    type(fixture, 'description', '   ');

    save(fixture);
    const request = http.expectOne('/api/v1/groups/grp_casa');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ name: 'Casa de la playa', description: null });
    request.flush({ data: { ...CASA, name: 'Casa de la playa', description: null }, ...META });
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(['/grupos', 'grp_casa']);
  });

  it('editGroupShouldShowTheSameFieldMessageAsCreatingWhenTheBackendRejectsIt', async () => {
    const fixture = await renderAs('OWNER');
    type(fixture, 'description', 'Nueva');

    save(fixture);
    http.expectOne('/api/v1/groups/grp_casa').flush(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Datos inválidos.',
          details: [{ field: 'description', reason: 'max_length_500' }],
        },
        ...META,
      },
      { status: 400, statusText: 'Bad Request' },
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Máximo 500 caracteres.');
  });

  it.each(['MEMBER', 'READ_ONLY'])(
    'editGroupShouldShowPermissionDeniedWithoutTheForm (%s)',
    async (role) => {
      const fixture = await renderAs(role);
      const element = fixture.nativeElement as HTMLElement;

      expect(element.textContent).toContain('No tienes permiso para editar este grupo.');
      expect(element.querySelector('form')).toBeNull();
    },
  );

  it.each([
    [403, 'PERMISSION_DENIED', 'No tienes permiso para editar este grupo.'],
    [404, 'GROUP_NOT_FOUND', 'Grupo no encontrado'],
  ])(
    'editGroupShouldLeaveTheFormWhenSavingIsNoLongerAllowed (%s)',
    async (status, code, message) => {
      // Mientras editabas, te degradaron (403) o te removieron (404).
      const fixture = await renderAs('ADMINISTRATOR');

      save(fixture);
      http
        .expectOne('/api/v1/groups/grp_casa')
        .flush({ error: { code, message: 'x' }, ...META }, { status, statusText: 'x' });
      await fixture.whenStable();
      fixture.detectChanges();

      const element = fixture.nativeElement as HTMLElement;
      expect(element.textContent).toContain(message);
      expect(element.querySelector('form')).toBeNull();
    },
  );

  it('editGroupShouldNotOfferTheFormForAnArchivedGroup', async () => {
    // Por ejemplo, al abrir un marcador de /grupos/:id/editar después de archivarlo.
    TestBed.configureTestingModule({
      imports: [EditGroupComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ groupId: 'grp_casa' }) } },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(EditGroupComponent);
    fixture.detectChanges();
    http
      .expectOne('/api/v1/groups/grp_casa')
      .flush({ data: { ...CASA, status: 'ARCHIVED' }, ...META });
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('El grupo está archivado: ya no se puede editar.');
    expect(element.querySelector('form')).toBeNull();
  });

  it('editGroupShouldLeaveTheFormWhenTheGroupWasArchivedMeanwhile', async () => {
    const fixture = await renderAs('OWNER');

    save(fixture);
    http
      .expectOne('/api/v1/groups/grp_casa')
      .flush(
        { error: { code: 'GROUP_ARCHIVED', message: 'x' }, ...META },
        { status: 409, statusText: 'Conflict' },
      );
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('El grupo está archivado: ya no se puede editar.');
    expect(element.querySelector('form')).toBeNull();
  });

  it('editGroupShouldNotSendAnEmptyOrBlankName', async () => {
    const fixture = await renderAs('OWNER');
    type(fixture, 'name', '   ');

    save(fixture);
    await fixture.whenStable();
    fixture.detectChanges();

    http.expectNone('/api/v1/groups/grp_casa');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Este campo es obligatorio.',
    );
  });

  it('editGroupShouldExplainAFieldThatCannotBeChanged', async () => {
    const fixture = await renderAs('OWNER');

    save(fixture);
    http.expectOne('/api/v1/groups/grp_casa').flush(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Datos inválidos.',
          details: [{ field: 'name', reason: 'not_allowed' }],
        },
        ...META,
      },
      { status: 400, statusText: 'Bad Request' },
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Este campo no se puede cambiar.',
    );
  });
});
