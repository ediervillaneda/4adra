import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ChangeMemberRoleDialogComponent } from './change-member-role-dialog.component';

const JUAN = {
  userId: 'usr_juan',
  displayName: 'Juan',
  photoUrl: null,
  role: 'MEMBER',
  status: 'ACTIVE',
  joinedAt: '2026-11-12T15:00:00.000Z',
};

const META = { meta: { requestId: 'req_1' } };

let http: HttpTestingController;
let close: ReturnType<typeof vi.fn>;

function render(): ComponentFixture<ChangeMemberRoleDialogComponent> {
  close = vi.fn();
  TestBed.configureTestingModule({
    imports: [ChangeMemberRoleDialogComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: MAT_DIALOG_DATA, useValue: { groupId: 'grp_casa', member: JUAN } },
      { provide: MatDialogRef, useValue: { close } },
    ],
  });
  http = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(ChangeMemberRoleDialogComponent);
  fixture.detectChanges();
  return fixture;
}

function radioInput(element: HTMLElement, role: string): HTMLInputElement | null {
  return element.querySelector<HTMLInputElement>(`[data-testid="role-option-${role}"] input`);
}

/** Elige el rol y pulsa "Guardar". */
function chooseAndSave(
  fixture: ComponentFixture<ChangeMemberRoleDialogComponent>,
  role: string,
): HTMLElement {
  const element = fixture.nativeElement as HTMLElement;
  radioInput(element, role)?.click();
  fixture.detectChanges();
  element.querySelector<HTMLButtonElement>('[data-testid="save-role"]')?.click();
  return element;
}

describe('ChangeMemberRoleDialogComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    http.verify();
  });

  it('changeRoleDialogShouldOfferFourRolesWithCurrentOneSelected', () => {
    const element = render().nativeElement as HTMLElement;

    expect(element.textContent).toContain('Juan');
    const labels = Array.from(element.querySelectorAll('[data-testid^="role-option-"]')).map(
      (option) => option.textContent?.trim(),
    );
    expect(labels).toEqual(['Propietario', 'Administrador', 'Miembro', 'Solo lectura']);
    expect(radioInput(element, 'MEMBER')?.checked).toBe(true);
  });

  it('changeRoleDialogShouldPatchRoleAndCloseWithUpdatedMember', async () => {
    const fixture = render();
    chooseAndSave(fixture, 'ADMINISTRATOR');

    const request = http.expectOne('/api/v1/groups/grp_casa/members/usr_juan');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ role: 'ADMINISTRATOR' });
    const updated = { ...JUAN, role: 'ADMINISTRATOR' };
    request.flush({ data: updated, ...META });
    await fixture.whenStable();

    expect(close).toHaveBeenCalledWith(updated);
  });

  it('changeRoleDialogShouldShowLastOwnerMessageAndStayOpen', async () => {
    const fixture = render();
    const element = chooseAndSave(fixture, 'READ_ONLY');

    http.expectOne('/api/v1/groups/grp_casa/members/usr_juan').flush(
      {
        error: { code: 'LAST_OWNER', message: 'El grupo necesita al menos un Propietario.' },
        ...META,
      },
      { status: 409, statusText: 'Conflict' },
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'El grupo necesita al menos un Propietario.',
    );
    expect(close).not.toHaveBeenCalled();
  });

  it('changeRoleDialogShouldSayTheGroupWasArchivedMeanwhile', async () => {
    const fixture = render();
    const element = chooseAndSave(fixture, 'READ_ONLY');

    http
      .expectOne('/api/v1/groups/grp_casa/members/usr_juan')
      .flush(
        { error: { code: 'GROUP_ARCHIVED', message: 'x' }, ...META },
        { status: 409, statusText: 'Conflict' },
      );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'El grupo está archivado.',
    );
  });

  it('changeRoleDialogShouldCloseWithoutResultOnCancel', () => {
    const element = render().nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('[data-testid="cancel-role"]')?.click();

    expect(close).toHaveBeenCalledWith(undefined);
  });

  it('changeRoleDialogShouldDisableSaveUntilAnotherRoleIsChosen', () => {
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;
    const save = (): HTMLButtonElement | null =>
      element.querySelector<HTMLButtonElement>('[data-testid="save-role"]');

    expect(save()?.disabled).toBe(true);
    radioInput(element, 'ADMINISTRATOR')?.click();
    fixture.detectChanges();
    expect(save()?.disabled).toBe(false);
    radioInput(element, 'MEMBER')?.click();
    fixture.detectChanges();
    expect(save()?.disabled).toBe(true);
  });
});
