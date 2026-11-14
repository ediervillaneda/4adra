import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { LoginComponent } from './login.component';
import { AuthService } from '../../core/auth/auth.service';

function render(
  error: string | null,
  volver: string | null = null,
): { element: HTMLElement; signIn: ReturnType<typeof vi.fn> } {
  const signIn = vi.fn().mockResolvedValue(undefined);
  TestBed.configureTestingModule({
    imports: [LoginComponent],
    providers: [
      { provide: AuthService, useValue: { signInWithGoogle: signIn } },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            queryParamMap: convertToParamMap({
              ...(error ? { error } : {}),
              ...(volver ? { volver } : {}),
            }),
          },
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(LoginComponent);
  fixture.detectChanges();
  return { element: fixture.nativeElement as HTMLElement, signIn };
}

describe('LoginComponent', () => {
  it('loginShouldCallSignInWithGoogleOnButtonClick', () => {
    const { element, signIn } = render(null);

    element.querySelector<HTMLButtonElement>('button')?.click();

    expect(signIn).toHaveBeenCalledTimes(1);
    expect(element.textContent).toContain('Continuar con Google');
  });

  it('loginShouldReturnToVolverAfterGoogle', () => {
    const { element, signIn } = render(null, '/unirse/codigo-1');

    element.querySelector<HTMLButtonElement>('button')?.click();

    expect(signIn).toHaveBeenCalledWith('/unirse/codigo-1');
  });

  it('loginShouldShowInvitationMessageWhenErrorIsNotInvited', () => {
    expect(render('NOT_INVITED').element.textContent).toContain('Necesitas una invitación');
  });

  it('loginShouldShowGenericMessageForOtherErrors', () => {
    const { element } = render('access_denied');

    expect(element.textContent).toContain('No se pudo iniciar sesión');
    expect(element.textContent).not.toContain('Necesitas una invitación');
  });

  it('loginShouldShowNoErrorWithoutErrorParam', () => {
    expect(render(null).element.querySelector('[role="alert"]')).toBeNull();
  });
});
