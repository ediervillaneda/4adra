import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { InvitationClosedError, InvitationsService } from './invitations.service';

describe('InvitationsService', () => {
  let service: InvitationsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(InvitationsService);
    http = TestBed.inject(HttpTestingController);
  });

  it.each([
    { status: 409, code: 'INVITATION_EXPIRED', message: 'Esta invitación ya venció.' },
    {
      status: 409,
      code: 'INVITATION_ALREADY_RESPONDED',
      message: 'Ya respondiste esta invitación.',
    },
    {
      status: 404,
      code: 'INVITATION_NOT_FOUND',
      message: 'Esta invitación ya no está disponible.',
    },
  ])('serviceShouldReportClosedInvitationInSpanish ($code)', async ({ status, code, message }) => {
    const accepted = service.accept('inv_1');
    http
      .expectOne({ method: 'POST', url: '/api/v1/invitations/inv_1/accept' })
      .flush({ error: { code, message: 'x' } }, { status, statusText: 'Error' });

    const error: unknown = await accepted.catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(InvitationClosedError);
    expect((error as Error).message).toBe(message);
  });
});
