import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  ApiErrorEnvelope,
  ApiSuccessEnvelope,
  Invitation,
  ReceivedInvitation,
} from '../../shared/api';
import { TEXTS } from '../../shared/texts';

/** La invitación ya no se puede responder (vencida, respondida o no disponible); `message` en español. */
export class InvitationClosedError extends Error {}

/** Invitaciones dirigidas al correo de quien inició sesión (docs/api/Members.md). */
@Injectable({ providedIn: 'root' })
export class InvitationsService {
  private readonly http = inject(HttpClient);

  async listMyInvitations(): Promise<ReceivedInvitation[]> {
    const response = await firstValueFrom(
      this.http.get<ApiSuccessEnvelope<ReceivedInvitation[]>>('/api/v1/invitations'),
    );
    return response.data;
  }

  async accept(invitationId: string): Promise<Invitation> {
    return this.respond(invitationId, 'accept');
  }

  async decline(invitationId: string): Promise<Invitation> {
    return this.respond(invitationId, 'decline');
  }

  private async respond(invitationId: string, answer: 'accept' | 'decline'): Promise<Invitation> {
    try {
      const response = await firstValueFrom(
        this.http.post<ApiSuccessEnvelope<Invitation>>(
          `/api/v1/invitations/${invitationId}/${answer}`,
          null,
        ),
      );
      return response.data;
    } catch (error) {
      const code =
        error instanceof HttpErrorResponse
          ? (error.error as Partial<ApiErrorEnvelope> | null)?.error?.code
          : undefined;
      const message = code === undefined ? undefined : TEXTS.home.closedInvitation[code];
      throw message === undefined ? error : new InvitationClosedError(message);
    }
  }
}
