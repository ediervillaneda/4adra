import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { GroupDetailComponent } from './group-detail.component';

const CASA = {
  id: 'grp_casa',
  name: 'Casa compartida',
  description: 'Arriendo y servicios',
  defaultCurrency: 'COP',
  status: 'ACTIVE',
  role: 'MEMBER',
  createdAt: '2026-11-12T15:00:00.000Z',
  updatedAt: '2026-11-12T15:00:00.000Z',
};

const MEMBERS = [
  {
    userId: 'usr_alvaro',
    displayName: 'Álvaro',
    photoUrl: 'https://example.com/alvaro.png',
    role: 'ADMINISTRATOR',
    status: 'ACTIVE',
    joinedAt: '2026-11-12T15:00:00.000Z',
  },
  {
    userId: 'usr_ana',
    displayName: 'Ana',
    photoUrl: null,
    role: 'MEMBER',
    status: 'ACTIVE',
    joinedAt: '2026-11-12T15:00:00.000Z',
  },
  {
    userId: 'usr_beto',
    displayName: 'beto',
    photoUrl: null,
    role: 'READ_ONLY',
    status: 'ACTIVE',
    joinedAt: '2026-11-12T15:00:00.000Z',
  },
  {
    userId: 'usr_zoe',
    displayName: 'Zoe',
    photoUrl: null,
    role: 'OWNER',
    status: 'ACTIVE',
    joinedAt: '2026-11-12T15:00:00.000Z',
  },
];

const META = { meta: { requestId: 'req_1' } };

let http: HttpTestingController;

function render(): ComponentFixture<GroupDetailComponent> {
  TestBed.configureTestingModule({
    imports: [GroupDetailComponent],
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
  const fixture = TestBed.createComponent(GroupDetailComponent);
  fixture.detectChanges();
  return fixture;
}

async function respondWithCasa(
  fixture: ComponentFixture<GroupDetailComponent>,
  role = 'MEMBER',
): Promise<HTMLElement> {
  http.expectOne('/api/v1/groups/grp_casa').flush({ data: { ...CASA, role }, ...META });
  http.expectOne('/api/v1/groups/grp_casa/members').flush({ data: MEMBERS, ...META });
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('GroupDetailComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    http.verify();
  });

  it('shouldShowGroupNameDescriptionAndCurrency', async () => {
    const element = await respondWithCasa(render());

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Casa compartida');
    expect(element.textContent).toContain('Arriendo y servicios');
    expect(element.textContent).toContain('COP');
  });

  it('shouldListMembersWithNamePhotoAndSpanishRoleLabel', async () => {
    const element = await respondWithCasa(render());

    const members = Array.from(element.querySelectorAll('[data-testid="member-item"]')).map(
      (item) => [
        item.querySelector('[data-testid="member-name"]')?.textContent?.trim(),
        item.querySelector('[data-testid="member-role"]')?.textContent?.trim(),
        item.querySelector('img')?.getAttribute('src') ?? null,
      ],
    );

    expect(members).toEqual([
      ['Álvaro', 'Administrador', 'https://example.com/alvaro.png'],
      ['Ana', 'Miembro', null],
      ['beto', 'Solo lectura', null],
      ['Zoe', 'Propietario', null],
    ]);
  });

  it('shouldShowLoadingThenGenericErrorOnOtherFailures', async () => {
    const fixture = render();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Cargando…');

    const failure = { error: { code: 'INTERNAL_ERROR', message: 'Error interno.' }, ...META };
    http
      .expectOne('/api/v1/groups/grp_casa')
      .flush(failure, { status: 500, statusText: 'Internal Server Error' });
    http
      .match('/api/v1/groups/grp_casa/members')
      .forEach((request) =>
        request.flush(failure, { status: 500, statusText: 'Internal Server Error' }),
      );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.textContent).not.toContain('Cargando…');
    expect(element.textContent).toContain('Algo salió mal.');
    expect(element.querySelector('[data-testid="member-item"]')).toBeNull();
  });

  it('shouldShowGroupNotFoundWhenApiReturns404', async () => {
    const fixture = render();
    const notFound = {
      error: { code: 'GROUP_NOT_FOUND', message: 'Grupo no encontrado.' },
      ...META,
    };

    http
      .expectOne('/api/v1/groups/grp_casa')
      .flush(notFound, { status: 404, statusText: 'Not Found' });
    http
      .match('/api/v1/groups/grp_casa/members')
      .forEach((request) => request.flush(notFound, { status: 404, statusText: 'Not Found' }));
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Grupo no encontrado');
    expect(element.querySelector('[data-testid="member-item"]')).toBeNull();
    expect(element.querySelector<HTMLAnchorElement>('a[href="/"]')).not.toBeNull();
  });

  it('groupDetailShouldShowInviteLinkOnlyForOwnerAndAdministrator', async () => {
    const visibility: Record<string, string | null> = {};
    for (const role of ['OWNER', 'ADMINISTRATOR', 'MEMBER', 'READ_ONLY']) {
      TestBed.resetTestingModule();
      const element = await respondWithCasa(render(), role);
      const link = element.querySelector<HTMLAnchorElement>('[data-testid="invite-link"]');
      visibility[role] = link?.getAttribute('href') ?? null;
      http.verify();
    }

    expect(visibility).toEqual({
      OWNER: '/grupos/grp_casa/invitar',
      ADMINISTRATOR: '/grupos/grp_casa/invitar',
      MEMBER: null,
      READ_ONLY: null,
    });
  });

  it('groupDetailShouldShowShareInviteLinkOnlyForOwnerAndAdministrator', async () => {
    const visibility: Record<string, string | null> = {};
    for (const role of ['OWNER', 'ADMINISTRATOR', 'MEMBER', 'READ_ONLY']) {
      TestBed.resetTestingModule();
      const element = await respondWithCasa(render(), role);
      const button = element.querySelector('[data-testid="share-invite-link"]');
      visibility[role] = button?.textContent?.trim() ?? null;
      http.verify();
    }

    expect(visibility).toEqual({
      OWNER: 'Compartir enlace',
      ADMINISTRATOR: 'Compartir enlace',
      MEMBER: null,
      READ_ONLY: null,
    });
  });
});
