import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { InviteMemberComponent } from './invite-member.component';

const INVITATIONS_URL = '/api/v1/groups/grp_casa/members/invitations';
const META = { meta: { requestId: 'req_1' } };

let http: HttpTestingController;

async function render(): Promise<ComponentFixture<InviteMemberComponent>> {
  TestBed.configureTestingModule({
    imports: [InviteMemberComponent],
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
  const fixture = TestBed.createComponent(InviteMemberComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

function typeEmail(fixture: ComponentFixture<InviteMemberComponent>, value: string): void {
  const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
    '[formControlName="email"]',
  )!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
  fixture.detectChanges();
}

async function openRoleOptions(
  fixture: ComponentFixture<InviteMemberComponent>,
): Promise<HTMLElement[]> {
  (fixture.nativeElement as HTMLElement)
    .querySelector<HTMLElement>('[formControlName="role"] .mat-mdc-select-trigger')!
    .click();
  fixture.detectChanges();
  await fixture.whenStable();
  return Array.from(document.querySelectorAll<HTMLElement>('mat-option'));
}

function submit(fixture: ComponentFixture<InviteMemberComponent>): void {
  (fixture.nativeElement as HTMLElement).querySelector('form')!.dispatchEvent(new Event('submit'));
  fixture.detectChanges();
}

async function settle(fixture: ComponentFixture<InviteMemberComponent>): Promise<HTMLElement> {
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('InviteMemberComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    http.verify();
  });

  it('inviteShouldPostEmailAndRoleAndShowConfirmation', async () => {
    const fixture = await render();

    typeEmail(fixture, '  juan@example.com ');
    const options = await openRoleOptions(fixture);
    expect(options.map((option) => option.textContent?.trim())).toEqual([
      'Administrador',
      'Miembro',
      'Solo lectura',
    ]);
    options[2]!.click();
    fixture.detectChanges();
    submit(fixture);

    const request = http.expectOne(INVITATIONS_URL);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'juan@example.com', role: 'READ_ONLY' });
    request.flush(
      {
        data: {
          invitationId: 'inv_1',
          groupId: 'grp_casa',
          email: 'juan@example.com',
          role: 'READ_ONLY',
          status: 'PENDING',
          expiresAt: '2026-11-19T15:00:00.000Z',
        },
        ...META,
      },
      { status: 201, statusText: 'Created' },
    );
    const element = await settle(fixture);

    expect(element.textContent).toContain('Invitación enviada');
  });

  it('inviteShouldExplainWhyWhenEmailIsNotAllowedOrAlreadyMember', async () => {
    const fixture = await render();
    const rejections = [
      {
        status: 422,
        code: 'EMAIL_NOT_ALLOWED',
        expected: 'Ese correo no está en la lista de acceso de 4adra.',
      },
      {
        status: 409,
        code: 'MEMBER_ALREADY_ACTIVE',
        expected: 'Esa persona ya es miembro del grupo.',
      },
    ];

    for (const { status, code, expected } of rejections) {
      typeEmail(fixture, 'eva@example.com');
      submit(fixture);
      http
        .expectOne(INVITATIONS_URL)
        .flush(
          { error: { code, message: 'mensaje del servidor' }, ...META },
          { status, statusText: 'Error' },
        );
      const element = await settle(fixture);

      expect(element.textContent).toContain(expected);
      expect(element.textContent).not.toContain('Invitación enviada');
    }
  });
});
