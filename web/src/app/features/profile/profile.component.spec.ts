import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProfileComponent } from './profile.component';
import { ProfileService, ProfileValidationError } from '../../core/profile/profile.service';
import { AuthService } from '../../core/auth/auth.service';
import { ProfileReviewFlag } from '../../core/profile/profile-review-flag';
import { CurrentProfileStore } from '../../core/profile/current-profile.store';
import { ANA_PROFILE } from '../../core/profile/profile.fixtures';

interface Fakes {
  getProfile: ReturnType<typeof vi.fn>;
  updateProfile: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
  markReviewed: ReturnType<typeof vi.fn>;
  openSnackBar: ReturnType<typeof vi.fn>;
  setProfile: ReturnType<typeof vi.fn>;
}

async function render(fakes: Fakes): Promise<ComponentFixture<ProfileComponent>> {
  TestBed.configureTestingModule({
    imports: [ProfileComponent],
    providers: [
      {
        provide: ProfileService,
        useValue: { getProfile: fakes.getProfile, updateProfile: fakes.updateProfile },
      },
      { provide: AuthService, useValue: { signOut: fakes.signOut } },
      { provide: ProfileReviewFlag, useValue: { markReviewed: fakes.markReviewed } },
      { provide: MatSnackBar, useValue: { open: fakes.openSnackBar } },
      { provide: CurrentProfileStore, useValue: { set: fakes.setProfile } },
    ],
  });
  const fixture = TestBed.createComponent(ProfileComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

function newFakes(): Fakes {
  return {
    getProfile: vi.fn().mockResolvedValue(ANA_PROFILE),
    updateProfile: vi.fn(),
    signOut: vi.fn().mockResolvedValue(undefined),
    markReviewed: vi.fn(),
    openSnackBar: vi.fn(),
    setProfile: vi.fn(),
  };
}

function input(fixture: ComponentFixture<ProfileComponent>, name: string): HTMLInputElement {
  return (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
    `[formControlName="${name}"]`,
  )!;
}

function type(fixture: ComponentFixture<ProfileComponent>, name: string, value: string): void {
  const element = input(fixture, name);
  element.value = value;
  element.dispatchEvent(new Event('input'));
  fixture.detectChanges();
}

async function submit(fixture: ComponentFixture<ProfileComponent>): Promise<void> {
  (fixture.nativeElement as HTMLElement).querySelector('form')!.dispatchEvent(new Event('submit'));
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('ProfileComponent', () => {
  let fakes: Fakes;

  beforeEach(() => {
    TestBed.resetTestingModule();
    fakes = newFakes();
  });

  it('componentShouldPrefillFormFromProfile', async () => {
    const fixture = await render(fakes);

    expect(input(fixture, 'displayName').value).toBe('Ana Pérez');
    expect(input(fixture, 'timeZone').value).toBe('America/Bogota');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('ana@example.com');
  });

  it('componentShouldSaveChangesAndShowSnackbar', async () => {
    fakes.updateProfile.mockResolvedValue({ ...ANA_PROFILE, displayName: 'Ana P.' });
    const fixture = await render(fakes);

    type(fixture, 'displayName', 'Ana P.');
    await submit(fixture);

    expect(fakes.updateProfile).toHaveBeenCalledWith({ displayName: 'Ana P.' });
    expect(fakes.openSnackBar).toHaveBeenCalledWith('Perfil guardado', undefined, {
      duration: 3000,
    });
    expect(fakes.markReviewed).toHaveBeenCalled();
    expect(fakes.setProfile).toHaveBeenCalledWith({ ...ANA_PROFILE, displayName: 'Ana P.' });
  });

  it('componentShouldShowFieldErrorNextToFieldAndKeepInput', async () => {
    fakes.updateProfile.mockRejectedValue(
      new ProfileValidationError({ timeZone: 'Zona horaria no válida.' }),
    );
    const fixture = await render(fakes);

    type(fixture, 'timeZone', 'Marte/Olympus');
    await submit(fixture);

    const field = input(fixture, 'timeZone').closest('mat-form-field') as HTMLElement;
    expect(field.textContent).toContain('Zona horaria no válida.');
    expect(input(fixture, 'timeZone').value).toBe('Marte/Olympus');
    expect(fakes.markReviewed).not.toHaveBeenCalled();
  });

  it('componentShouldNotCallApiWhenNameIsBlank', async () => {
    const fixture = await render(fakes);

    type(fixture, 'displayName', '   ');
    await submit(fixture);

    expect(fakes.updateProfile).not.toHaveBeenCalled();
  });

  it('componentShouldOfferOnlySupportedCurrenciesAndLanguages', async () => {
    const fixture = await render(fakes);
    const component = fixture.componentInstance as unknown as {
      currencies: readonly string[];
      languages: readonly string[];
    };

    expect(component.currencies).toEqual(['COP', 'USD', 'EUR', 'MXN', 'GTQ']);
    expect(component.languages).toEqual(['es', 'en']);
  });

  it('componentShouldNotHaveAnyPhoneField', async () => {
    const fixture = await render(fakes);
    const html = (fixture.nativeElement as HTMLElement).innerHTML.toLowerCase();

    expect(html).not.toContain('teléfono');
    expect(html).not.toContain('phone');
    expect(html).not.toContain('celular');
    expect((fixture.nativeElement as HTMLElement).querySelector('input[type="tel"]')).toBeNull();
  });

  it('componentShouldSignOutOnButtonClick', async () => {
    const fixture = await render(fakes);

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('[data-testid="sign-out"]')!
      .click();

    expect(fakes.signOut).toHaveBeenCalled();
  });

  it('componentShouldShowErrorStateWhenProfileFailsToLoad', async () => {
    fakes.getProfile.mockRejectedValue(new Error('500'));
    const fixture = await render(fakes);

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Algo salió mal.');
  });
});
