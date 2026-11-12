import { describe, it, expect, beforeEach } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomeComponent } from './home.component';
import { AuthService, SessionState } from '../../core/auth/auth.service';
import { ProfileReviewFlag } from '../../core/profile/profile-review-flag';
import { CurrentProfileStore } from '../../core/profile/current-profile.store';
import { UserProfile } from '../../shared/api';
import { ANA_PROFILE } from '../../core/profile/profile.fixtures';

function render(reviewed: boolean, profile: UserProfile | null = null): HTMLElement {
  const session = signal<SessionState>({
    status: 'authenticated',
    user: { name: 'Ana', email: 'ana@example.com', image: null },
  });
  TestBed.configureTestingModule({
    imports: [HomeComponent],
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: { session } },
      { provide: ProfileReviewFlag, useValue: { isReviewed: () => reviewed } },
      {
        provide: CurrentProfileStore,
        useValue: { profile: signal(profile), load: () => Promise.resolve() },
      },
    ],
  });
  const fixture = TestBed.createComponent(HomeComponent);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('HomeComponent', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('homeShouldGreetUserByNameAndShowEmptyGroupsState', () => {
    const element = render(true);

    expect(element.textContent).toContain('Hola, Ana');
    expect(element.textContent).toContain('Tus grupos aparecerán aquí');
    expect(element.querySelector<HTMLButtonElement>('button[disabled]')?.textContent).toContain(
      'Crear grupo (pronto)',
    );
  });

  it('homeShouldGreetWithTheAppProfileNameOnceLoaded', () => {
    expect(render(true, { ...ANA_PROFILE, displayName: 'Anita' }).textContent).toContain(
      'Hola, Anita',
    );
  });

  it('homeShouldShowReviewProfileHintUntilProfileSaved', () => {
    expect(render(false).textContent).toContain('Revisa tu perfil');
    TestBed.resetTestingModule();
    expect(render(true).textContent).not.toContain('Revisa tu perfil');
  });
});
