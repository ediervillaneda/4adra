import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProfileService, ProfileValidationError } from './profile.service';
import { ANA_PROFILE } from './profile.fixtures';

describe('ProfileService', () => {
  let service: ProfileService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProfileService);
    http = TestBed.inject(HttpTestingController);
  });

  it('serviceShouldGetAndPatchApiV1Me', async () => {
    const loaded = service.getProfile();
    http.expectOne({ method: 'GET', url: '/api/v1/me' }).flush({
      data: ANA_PROFILE,
      meta: { requestId: 'r1' },
    });
    expect(await loaded).toEqual(ANA_PROFILE);

    const saved = service.updateProfile({ preferredCurrency: 'USD' });
    const request = http.expectOne({ method: 'PATCH', url: '/api/v1/me' });
    expect(request.request.body).toEqual({ preferredCurrency: 'USD' });
    request.flush({
      data: { ...ANA_PROFILE, preferredCurrency: 'USD' },
      meta: { requestId: 'r2' },
    });
    expect((await saved).preferredCurrency).toBe('USD');
  });

  it('serviceShouldMapValidationDetailsToSpanishFieldErrors', async () => {
    const saved = service.updateProfile({ language: 'fr' });
    http.expectOne('/api/v1/me').flush(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'x',
          details: [
            { field: 'language', reason: 'unsupported_language' },
            { field: 'timeZone', reason: 'algo_nuevo' },
          ],
        },
        meta: { requestId: 'r3' },
      },
      { status: 400, statusText: 'Bad Request' },
    );

    const error = await saved.catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ProfileValidationError);
    expect((error as ProfileValidationError).fieldErrors).toEqual({
      language: 'Idioma no soportado.',
      timeZone: 'Valor inválido.',
    });
  });

  it('serviceShouldRethrowNonValidationErrors', async () => {
    const saved = service.updateProfile({ language: 'en' });
    http.expectOne('/api/v1/me').flush(null, { status: 500, statusText: 'Error' });

    const error = await saved.catch((caught: unknown) => caught);
    expect(error).not.toBeInstanceOf(ProfileValidationError);
  });
});
