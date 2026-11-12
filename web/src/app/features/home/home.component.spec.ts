import { describe, it, expect, beforeEach } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomeComponent } from './home.component';
import { AuthService, SessionState } from '../../core/auth/auth.service';
import { ProfileReviewFlag } from '../../core/profile/profile-review-flag';
import { CurrentProfileStore } from '../../core/profile/current-profile.store';
import { GroupsService } from '../../core/groups/groups.service';
import { GroupSummary, UserProfile } from '../../shared/api';
import { ANA_PROFILE } from '../../core/profile/profile.fixtures';

interface RenderOptions {
  reviewed?: boolean;
  profile?: UserProfile | null;
  groups?: GroupSummary[];
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
        useValue: { listGroups: () => Promise.resolve(options.groups ?? []) },
      },
    ],
  });
  const fixture = TestBed.createComponent(HomeComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
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

  it('homeShouldShowEmptyStateWhenUserHasNoGroups', async () => {
    const element = await render({ groups: [] });
    const createLink = element.querySelector<HTMLAnchorElement>('a[href="/grupos/nuevo"]');

    expect(element.textContent).toContain('Tus grupos aparecerán aquí');
    expect(element.querySelector('[data-testid="group-item"]')).toBeNull();
    expect(createLink?.textContent).toContain('Crear grupo');
  });
});
