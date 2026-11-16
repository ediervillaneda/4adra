import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { CurrentProfileStore } from '../../../core/profile/current-profile.store';
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

/** Lo que devuelve el diálogo "Cambiar rol" al cerrarse (undefined: cerrado sin cambios). */
let dialogResult: unknown;
let openedDialogs: unknown[];
/** Quién mira el detalle: así el componente sabe cuál es su propia fila. */
let currentUserId: string | null;
/** Cómo responde `CurrentProfileStore.load()`; por defecto, el perfil ya está cargado. */
let loadProfile: (profile: ReturnType<typeof signal<{ id: string } | null>>) => Promise<void>;

function render(userId: string | null = 'usr_otro'): ComponentFixture<GroupDetailComponent> {
  dialogResult = undefined;
  openedDialogs = [];
  currentUserId = userId;
  loadProfile ??= () => Promise.resolve();
  const profile = signal<{ id: string } | null>(
    currentUserId === null ? null : { id: currentUserId },
  );
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
      {
        provide: CurrentProfileStore,
        useValue: { profile, load: () => loadProfile(profile) },
      },
      {
        provide: MatDialog,
        useValue: {
          open: (_component: unknown, config: { data: unknown }) => {
            openedDialogs.push(config.data);
            return { afterClosed: () => of(dialogResult) };
          },
        },
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
  status = 'ACTIVE',
): Promise<HTMLElement> {
  http.expectOne('/api/v1/groups/grp_casa').flush({ data: { ...CASA, role, status }, ...META });
  http.expectOne('/api/v1/groups/grp_casa/members').flush({ data: MEMBERS, ...META });
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('GroupDetailComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    loadProfile = () => Promise.resolve();
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

  it('groupDetailShouldShowChangeRoleOnEveryMemberOnlyForOwner', async () => {
    const buttons: Record<string, number> = {};
    for (const role of ['OWNER', 'ADMINISTRATOR', 'MEMBER', 'READ_ONLY']) {
      TestBed.resetTestingModule();
      const element = await respondWithCasa(render(), role);
      buttons[role] = element.querySelectorAll('[data-testid="change-role"]').length;
      http.verify();
    }

    expect(buttons).toEqual({ OWNER: 4, ADMINISTRATOR: 0, MEMBER: 0, READ_ONLY: 0 });
  });

  it('groupDetailShouldReloadAfterRoleChangeAndHideOwnerActionsWhenOwnerDemotedThemself', async () => {
    const fixture = render();
    const element = await respondWithCasa(fixture, 'OWNER');
    const zoe = MEMBERS[3];
    dialogResult = { ...zoe, role: 'MEMBER' };

    element.querySelectorAll<HTMLButtonElement>('[data-testid="change-role"]')[3]?.click();
    expect(openedDialogs).toEqual([{ groupId: 'grp_casa', member: zoe }]);

    // El backend dice que ahora el actor es Member: la pantalla recarga y oculta las opciones.
    http.expectOne('/api/v1/groups/grp_casa').flush({ data: { ...CASA, role: 'MEMBER' }, ...META });
    http.expectOne('/api/v1/groups/grp_casa/members').flush({
      data: MEMBERS.map((member) =>
        member.userId === 'usr_zoe' ? { ...member, role: 'MEMBER' } : member,
      ),
      ...META,
    });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.querySelectorAll('[data-testid="change-role"]').length).toBe(0);
    expect(element.querySelector('[data-testid="share-invite-link"]')).toBeNull();
    const roles = Array.from(element.querySelectorAll('[data-testid="member-role"]')).map((role) =>
      role.textContent?.trim(),
    );
    expect(roles[3]).toBe('Miembro');
  });

  it('groupDetailShouldNotReloadWhenChangeRoleDialogClosesWithoutChanges', async () => {
    const fixture = render();
    const element = await respondWithCasa(fixture, 'OWNER');
    // Así cierra MatDialogClose un botón con `mat-dialog-close` sin valor.
    dialogResult = '';

    element.querySelector<HTMLButtonElement>('[data-testid="change-role"]')?.click();

    http.expectNone('/api/v1/groups/grp_casa');
    expect(element.querySelectorAll('[data-testid="change-role"]').length).toBe(4);
  });

  it('groupDetailShouldShowRemoveOnlyOnMembersTheActorCanRemoveExceptThemself', async () => {
    // Quien mira es Zoe (Owner), Álvaro (Administrator), Ana (Member) o beto (ReadOnly).
    const viewers = [
      ['OWNER', 'usr_zoe'],
      ['ADMINISTRATOR', 'usr_alvaro'],
      ['MEMBER', 'usr_ana'],
      ['READ_ONLY', 'usr_beto'],
    ] as const;
    const removable: Record<string, (string | undefined)[]> = {};
    for (const [role, userId] of viewers) {
      TestBed.resetTestingModule();
      const element = await respondWithCasa(render(userId), role);
      removable[role] = Array.from(element.querySelectorAll('[data-testid="member-item"]'))
        .filter((item) => item.querySelector('[data-testid="remove-member"]') !== null)
        .map((item) => item.querySelector('[data-testid="member-name"]')?.textContent?.trim());
      http.verify();
    }

    expect(removable).toEqual({
      OWNER: ['Álvaro', 'Ana', 'beto'],
      ADMINISTRATOR: ['Ana', 'beto'],
      MEMBER: [],
      READ_ONLY: [],
    });
  });

  it('groupDetailShouldRemoveAfterConfirmingAndReloadTheList', async () => {
    const fixture = render('usr_zoe');
    const element = await respondWithCasa(fixture, 'OWNER');
    dialogResult = true;

    const anaRow = Array.from(element.querySelectorAll('[data-testid="member-item"]'))[1];
    anaRow?.querySelector<HTMLButtonElement>('[data-testid="remove-member"]')?.click();
    const dialog = openedDialogs[0] as { title: string; confirm: () => Promise<void> };
    expect(dialog.title).toBe('¿Remover a «Ana» del grupo?');

    const confirmed = dialog.confirm();
    const request = http.expectOne('/api/v1/groups/grp_casa/members/usr_ana');
    expect(request.request.method).toBe('DELETE');
    request.flush({ data: { ...MEMBERS[1], status: 'REMOVED' }, ...META });
    await confirmed;

    http.expectOne('/api/v1/groups/grp_casa').flush({ data: { ...CASA, role: 'OWNER' }, ...META });
    http.expectOne('/api/v1/groups/grp_casa/members').flush({
      data: MEMBERS.filter((member) => member.userId !== 'usr_ana'),
      ...META,
    });
    await fixture.whenStable();
    fixture.detectChanges();

    const names = Array.from(element.querySelectorAll('[data-testid="member-name"]')).map((name) =>
      name.textContent?.trim(),
    );
    expect(names).toEqual(['Álvaro', 'beto', 'Zoe']);
  });

  it.each([
    ['leave-group', '/api/v1/groups/grp_casa/leave'],
    ['remove-member', '/api/v1/groups/grp_casa/members/usr_alvaro'],
  ])('groupDetailShouldSayTheGroupWasArchivedMeanwhile (%s)', async (action, url) => {
    // Otra pestaña (u otro Propietario) lo archivó con este detalle abierto.
    const fixture = render('usr_zoe');
    const element = await respondWithCasa(fixture, 'OWNER');

    element.querySelector<HTMLButtonElement>(`[data-testid="${action}"]`)?.click();
    const dialog = openedDialogs[0] as { confirm: () => Promise<void> };

    const confirmed = dialog.confirm();
    http
      .expectOne(url)
      .flush(
        { error: { code: 'GROUP_ARCHIVED', message: 'x' }, ...META },
        { status: 409, statusText: 'Conflict' },
      );

    await expect(confirmed).rejects.toThrow('El grupo está archivado.');
  });

  it('groupDetailShouldRejectRemovalWithTheBackendMessage', async () => {
    const fixture = render('usr_zoe');
    const element = await respondWithCasa(fixture, 'OWNER');

    element.querySelector<HTMLButtonElement>('[data-testid="remove-member"]')?.click();
    const dialog = openedDialogs[0] as { confirm: () => Promise<void> };

    const confirmed = dialog.confirm();
    http.expectOne('/api/v1/groups/grp_casa/members/usr_alvaro').flush(
      {
        error: { code: 'MEMBER_NOT_FOUND', message: 'Miembro no encontrado.' },
        ...META,
      },
      { status: 404, statusText: 'Not Found' },
    );

    await expect(confirmed).rejects.toThrow('Esa persona ya no es miembro del grupo.');
  });

  it('groupDetailShouldHideRemoveUntilItKnowsWhoIsViewing', async () => {
    // GET /me falla: sin saber cuál es la fila propia, no se ofrece "Remover" en ninguna.
    loadProfile = () => Promise.resolve();
    const element = await respondWithCasa(render(null), 'OWNER');

    expect(element.querySelectorAll('[data-testid="remove-member"]').length).toBe(0);
  });

  it('groupDetailShouldWaitForTheProfileBeforeShowingRemove', async () => {
    // El perfil llega después del grupo: whenStable lo espera y luego aparece "Remover".
    loadProfile = (profile) =>
      new Promise((resolve) =>
        setTimeout(() => {
          profile.set({ id: 'usr_zoe' });
          resolve();
        }, 50),
      );
    const element = await respondWithCasa(render(null), 'OWNER');

    const removable = Array.from(element.querySelectorAll('[data-testid="member-item"]'))
      .filter((item) => item.querySelector('[data-testid="remove-member"]') !== null)
      .map((item) => item.querySelector('[data-testid="member-name"]')?.textContent?.trim());
    expect(removable).toEqual(['Álvaro', 'Ana', 'beto']);
  });

  it('groupDetailShouldOfferLeaveTheGroupToEveryRole', async () => {
    const labels: Record<string, string | null> = {};
    for (const role of ['OWNER', 'ADMINISTRATOR', 'MEMBER', 'READ_ONLY']) {
      TestBed.resetTestingModule();
      const element = await respondWithCasa(render('usr_zoe'), role);
      labels[role] =
        element.querySelector('[data-testid="leave-group"]')?.textContent?.trim() ?? null;
      http.verify();
    }

    expect(labels).toEqual({
      OWNER: 'Salir del grupo',
      ADMINISTRATOR: 'Salir del grupo',
      MEMBER: 'Salir del grupo',
      READ_ONLY: 'Salir del grupo',
    });
  });

  it('groupDetailShouldLeaveAfterConfirmingAndGoBackHome', async () => {
    const fixture = render('usr_ana');
    const element = await respondWithCasa(fixture, 'MEMBER');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    dialogResult = true;

    element.querySelector<HTMLButtonElement>('[data-testid="leave-group"]')?.click();
    const dialog = openedDialogs[0] as { title: string; confirm: () => Promise<void> };
    expect(dialog.title).toBe('¿Salir de «Casa compartida»?');

    const confirmed = dialog.confirm();
    const request = http.expectOne('/api/v1/groups/grp_casa/leave');
    expect(request.request.method).toBe('POST');
    request.flush({ data: { ...MEMBERS[1], status: 'REMOVED' }, ...META });
    await confirmed;

    expect(navigate).toHaveBeenCalledWith(['/']);
    http.expectNone('/api/v1/groups/grp_casa');
  });

  it('groupDetailShouldExplainWhyTheOnlyOwnerCannotLeave', async () => {
    const fixture = render('usr_zoe');
    const element = await respondWithCasa(fixture, 'OWNER');

    element.querySelector<HTMLButtonElement>('[data-testid="leave-group"]')?.click();
    const dialog = openedDialogs[0] as { confirm: () => Promise<void> };

    const confirmed = dialog.confirm();
    http.expectOne('/api/v1/groups/grp_casa/leave').flush(
      {
        error: { code: 'LAST_OWNER', message: 'El grupo necesita al menos un Propietario.' },
        ...META,
      },
      { status: 409, statusText: 'Conflict' },
    );

    await expect(confirmed).rejects.toThrow('El grupo necesita al menos un Propietario.');
  });

  it('groupDetailShouldTreatLeavingAGroupYouAreNoLongerInAsDone', async () => {
    // Te removieron (o saliste en otra pestaña): salir responde 404, que es justo lo que querías.
    const fixture = render('usr_ana');
    const element = await respondWithCasa(fixture, 'MEMBER');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    dialogResult = true;

    element.querySelector<HTMLButtonElement>('[data-testid="leave-group"]')?.click();
    const dialog = openedDialogs[0] as { confirm: () => Promise<void> };

    const confirmed = dialog.confirm();
    http
      .expectOne('/api/v1/groups/grp_casa/leave')
      .flush(
        { error: { code: 'GROUP_NOT_FOUND', message: 'Grupo no encontrado.' }, ...META },
        { status: 404, statusText: 'Not Found' },
      );

    await expect(confirmed).resolves.toBeUndefined();
    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('groupDetailShouldStayUnstableUntilTheNavigationHomeFinishes', async () => {
    const fixture = render('usr_ana');
    const element = await respondWithCasa(fixture, 'MEMBER');
    let arrivedHome = false;
    vi.spyOn(TestBed.inject(Router), 'navigate').mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => {
            arrivedHome = true;
            resolve(true);
          }, 50),
        ),
    );
    dialogResult = true;

    element.querySelector<HTMLButtonElement>('[data-testid="leave-group"]')?.click();
    await fixture.whenStable();

    expect(arrivedHome).toBe(true);
  });

  it('groupDetailShouldShowEditOnlyForOwnerAndAdministrator', async () => {
    const links: Record<string, string | null> = {};
    for (const role of ['OWNER', 'ADMINISTRATOR', 'MEMBER', 'READ_ONLY']) {
      TestBed.resetTestingModule();
      const element = await respondWithCasa(render(), role);
      links[role] =
        element
          .querySelector<HTMLAnchorElement>('[data-testid="edit-group"]')
          ?.getAttribute('href') ?? null;
      http.verify();
    }

    expect(links).toEqual({
      OWNER: '/grupos/grp_casa/editar',
      ADMINISTRATOR: '/grupos/grp_casa/editar',
      MEMBER: null,
      READ_ONLY: null,
    });
  });

  it('groupDetailShouldShowArchivedBannerAndNoActionsForAnyRole', async () => {
    const actions = [
      'edit-group',
      'invite-link',
      'share-invite-link',
      'change-role',
      'remove-member',
      'leave-group',
      'archive-group',
    ];
    for (const role of ['OWNER', 'ADMINISTRATOR', 'MEMBER', 'READ_ONLY']) {
      TestBed.resetTestingModule();
      const element = await respondWithCasa(render(), role, 'ARCHIVED');

      expect(element.querySelector('[data-testid="archived-banner"]')?.textContent).toContain(
        'Grupo archivado',
      );
      expect(element.querySelectorAll('[data-testid="member-item"]')).toHaveLength(4);
      const shown = actions.filter((action) => element.querySelector(`[data-testid="${action}"]`));
      expect({ role, shown }).toEqual({ role, shown: [] });
      http.verify();
    }
  });

  it('groupDetailShouldOfferArchiveOnlyToTheOwnerOfAnActiveGroup', async () => {
    const labels: Record<string, string | null> = {};
    for (const role of ['OWNER', 'ADMINISTRATOR', 'MEMBER', 'READ_ONLY']) {
      TestBed.resetTestingModule();
      const element = await respondWithCasa(render(), role);
      labels[role] =
        element.querySelector('[data-testid="archive-group"]')?.textContent?.trim() ?? null;
      expect(element.querySelector('[data-testid="archived-banner"]')).toBeNull();
      http.verify();
    }

    expect(labels).toEqual({
      OWNER: 'Archivar grupo',
      ADMINISTRATOR: null,
      MEMBER: null,
      READ_ONLY: null,
    });
  });

  it('groupDetailShouldArchiveAfterConfirmingAndGoBackHome', async () => {
    const fixture = render('usr_zoe');
    const element = await respondWithCasa(fixture, 'OWNER');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    dialogResult = true;

    element.querySelector<HTMLButtonElement>('[data-testid="archive-group"]')?.click();
    const dialog = openedDialogs[0] as {
      title: string;
      message: string;
      confirm: () => Promise<void>;
    };
    expect(dialog.title).toBe('¿Archivar «Casa compartida»?');
    expect(dialog.message).toContain('No se puede deshacer');

    const confirmed = dialog.confirm();
    const request = http.expectOne('/api/v1/groups/grp_casa/archive');
    expect(request.request.method).toBe('POST');
    request.flush({ data: { ...CASA, role: 'OWNER', status: 'ARCHIVED' }, ...META });
    await confirmed;

    expect(navigate).toHaveBeenCalledWith(['/']);
  });
});
