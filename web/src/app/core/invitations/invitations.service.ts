import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiSuccessEnvelope, Invitation, ReceivedInvitation } from '../../shared/api';

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
    const response = await firstValueFrom(
      this.http.post<ApiSuccessEnvelope<Invitation>>(
        `/api/v1/invitations/${invitationId}/${answer}`,
        null,
      ),
    );
    return response.data;
  }
}
