import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomeComponent } from './home.component';
import { AuthService, SessionState } from '../../core/auth/auth.service';
import { ProfileReviewFlag } from '../../core/profile/profile-review-flag';
import { CurrentProfileStore } from '../../core/profile/current-profile.store';
import { GroupsService } from '../../core/groups/groups.service';
import { InvitationsService } from '../../core/invitations/invitations.service';
import { GroupSummary, ReceivedInvitation, UserProfile } from '../../shared/api';
import { ANA_PROFILE } from '../../core/profile/profile.fixtures';

interface RenderOptions {
  reviewed?: boolean;
  profile?: UserProfile | null;
  groups?: GroupSummary[];
  invitations?: ReceivedInvitation[];
  listGroups?: () => Promise<GroupSummary[]>;
  accept?: (invitationId: string) => Promise<unknown>;
  decline?: (invitationId: string) => Promise<unknown>;
}

let fixture: ComponentFixture<HomeComponent>;

function invitationOf(overrides: Partial<ReceivedInvitation>): ReceivedInvitation {
  return {
    invitationId: 'inv_1',
    groupId: 'grp_playa',
    groupName: 'Playa',
    invitedByName: 'Beto',
    role: 'MEMBER',
    expiresAt: '2026-11-19T15:00:00.000Z',
    ...overrides,
  };
}

function groupOf(overrides: Partial<GroupSummary>): GroupSummary {
  return {
    id: 'grp_1',
    name: 'Casa',
    description: null,
    defaultCurrency: 'COP',
    status: 'ACTIVE',
    role: 'OWNER',
    createdAt: '2026-11-12T15:00:00.000Z',
    updatedAt: '2026-11-12T15:00:00.000Z',
    ...overrides,
  };
}

async function render(options: RenderOptions = {}): Promise<HTMLElement> {
  const session = signal<SessionState>({
    status: 'authenticated',
    user: { name: 'Ana', email: 'ana@example.com', image: null },
  });
  TestBed.configureTestingModule({
    imports: [HomeComponent],
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: { session } },
      { provide: ProfileReviewFlag, useValue: { isReviewed: () => options.reviewed ?? true } },
      {
        provide: CurrentProfileStore,
        useValue: { profile: signal(options.profile ?? null), load: () => Promise.resolve() },
      },
      {
        provide: GroupsService,
        useValue: {
          listGroups:
            options.listGroups ??
            ((): Promise<GroupSummary[]> => Promise.resolve(options.groups ?? [])),
        },
      },
      {
        provide: InvitationsService,
        useValue: {
          listMyInvitations: () => Promise.resolve(options.invitations ?? []),
          accept: options.accept,
          decline: options.decline,
        },
      },
    ],
  });
  fixture = TestBed.createComponent(HomeComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

async function click(element: HTMLElement, testId: string): Promise<void> {
  element.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`)?.click();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('HomeComponent', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('homeShouldGreetUserByName', async () => {
    expect((await render()).textContent).toContain('Hola, Ana');
  });

  it('homeShouldGreetWithTheAppProfileNameOnceLoaded', async () => {
    const element = await render({ profile: { ...ANA_PROFILE, displayName: 'Anita' } });

    expect(element.textContent).toContain('Hola, Anita');
  });

  it('homeShouldShowReviewProfileHintUntilProfileSaved', async () => {
    expect((await render({ reviewed: false })).textContent).toContain('Revisa tu perfil');
    TestBed.resetTestingModule();
    expect((await render({ reviewed: true })).textContent).not.toContain('Revisa tu perfil');
  });

  it('homeShouldListGroupsWithNameRoleAndCurrency', async () => {
    const element = await render({
      groups: [
        groupOf({ id: 'grp_casa', name: 'Casa', role: 'OWNER', defaultCurrency: 'COP' }),
        groupOf({
          id: 'grp_viaje',
          name: 'Viaje Guatemala',
          role: 'MEMBER',
          defaultCurrency: 'USD',
        }),
      ],
    });
    const items = Array.from(element.querySelectorAll('[data-testid="group-item"]')).map(
      (item) => item.textContent,
    );

    expect(items).toHaveLength(2);
    expect(items[0]).toContain('Casa');
    expect(items[0]).toContain('Propietario');
    expect(items[0]).toContain('COP');
    expect(items[1]).toContain('Viaje Guatemala');
    expect(items[1]).toContain('Miembro');
    expect(items[1]).toContain('USD');
    expect(element.textContent).not.toContain('Tus grupos aparecerán aquí');
  });

  it('homeShouldLinkEachGroupToItsDetail', async () => {
    const element = await render({
      groups: [
        groupOf({ id: 'grp_casa', name: 'Casa' }),
        groupOf({ id: 'grp_viaje', name: 'Viaje' }),
      ],
    });

    const links = Array.from(
      element.querySelectorAll<HTMLAnchorElement>('a[data-testid="group-item"]'),
    ).map((link) => [
      link.querySelector('[matListItemTitle]')?.textContent?.trim(),
      link.getAttribute('href'),
    ]);

    expect(links).toEqual([
      ['Casa', '/grupos/grp_casa'],
      ['Viaje', '/grupos/grp_viaje'],
    ]);
  });

  it('homeShouldListInvitationsWithGroupInviterAndRole', async () => {
    const element = await render({
      invitations: [
        invitationOf({
          invitationId: 'inv_playa',
          groupName: 'Playa',
          invitedByName: 'Beto',
          role: 'ADMINISTRATOR',
        }),
      ],
    });
    const section = element.querySelector('[data-testid="invitations-section"]');
    const items = Array.from(element.querySelectorAll('[data-testid="invitation-item"]')).map(
      (item) => item.textContent,
    );

    expect(section?.textContent).toContain('Invitaciones');
    expect(items).toHaveLength(1);
    expect(items[0]).toContain('Playa');
    expect(items[0]).toContain('Beto');
    expect(items[0]).toContain('Administrador');
  });

  it('homeShouldHideInvitationsSectionWhenThereAreNone', async () => {
    const element = await render({ invitations: [] });

    expect(element.querySelector('[data-testid="invitations-section"]')).toBeNull();
    expect(element.textContent).not.toContain('Invitaciones');
  });

  it('homeShouldRemoveInvitationAndReloadGroupsOnAccept', async () => {
    const accept = vi.fn().mockResolvedValue(undefined);
    const listGroups = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([groupOf({ id: 'grp_playa', name: 'Playa', role: 'MEMBER' })]);
    const element = await render({
      invitations: [invitationOf({ invitationId: 'inv_playa', groupName: 'Playa' })],
      listGroups,
      accept,
    });

    await click(element, 'accept-invitation');

    expect(accept).toHaveBeenCalledWith('inv_playa');
    expect(element.querySelector('[data-testid="invitations-section"]')).toBeNull();
    expect(element.querySelector('[data-testid="group-item"]')?.textContent).toContain('Playa');
  });

  it('homeShouldRemoveInvitationOnDecline', async () => {
    const decline = vi.fn().mockResolvedValue(undefined);
    const element = await render({
      invitations: [
        invitationOf({ invitationId: 'inv_playa', groupName: 'Playa' }),
        invitationOf({ invitationId: 'inv_casa', groupName: 'Casa' }),
      ],
      decline,
    });

    await click(element, 'decline-invitation');

    expect(decline).toHaveBeenCalledWith('inv_playa');
    const items = Array.from(element.querySelectorAll('[data-testid="invitation-item"]'));
    expect(items.map((item) => item.textContent)).toEqual([expect.stringContaining('Casa')]);
    expect(element.querySelector('[data-testid="group-item"]')).toBeNull();
  });

  it.each(['accept', 'decline'] as const)(
    'homeShouldKeepInvitationAndShowErrorWhenAnswerFails (%s)',
    async (answer) => {
      const failing = vi.fn().mockRejectedValue(new Error('500'));
      const element = await render({
        invitations: [invitationOf({ invitationId: 'inv_playa', groupName: 'Playa' })],
        [answer]: failing,
      });

      await click(element, `${answer}-invitation`);

      const item = element.querySelector('[data-testid="invitation-item"]');
      expect(item?.textContent).toContain('Playa');
      expect(item?.textContent).toContain('No se pudo responder la invitación. Intenta de nuevo.');
    },
  );

  it('homeShouldShowEmptyStateWhenUserHasNoGroups', async () => {
    const element = await render({ groups: [] });
    const createLink = element.querySelector<HTMLAnchorElement>('a[href="/grupos/nuevo"]');

    expect(element.textContent).toContain('Tus grupos aparecerán aquí');
    expect(element.querySelector('[data-testid="group-item"]')).toBeNull();
    expect(createLink?.textContent).toContain('Crear grupo');
  });
});
