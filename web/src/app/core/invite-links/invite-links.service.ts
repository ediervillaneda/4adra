import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  ApiErrorEnvelope,
  ApiSuccessEnvelope,
  InviteLink,
  InviteLinkPreview,
  JoinedMembership,
} from '../../shared/api';
import { TEXTS } from '../../shared/texts';

/** El enlace ya no sirve (no existe, fue reemplazado o venció); `message` ya está en español. */
export class InviteLinkUnavailableError extends Error {}

function toUnavailable(error: unknown): unknown {
  const code =
    error instanceof HttpErrorResponse
      ? (error.error as Partial<ApiErrorEnvelope> | null)?.error?.code
      : undefined;
  const message = code === undefined ? undefined : TEXTS.inviteLinks.unavailable[code];
  return message === undefined ? error : new InviteLinkUnavailableError(message);
}

/** Enlaces de invitación a un grupo (docs/api/Members.md). */
@Injectable({ providedIn: 'root' })
export class InviteLinksService {
  private readonly http = inject(HttpClient);

  async createLink(groupId: string): Promise<InviteLink> {
    const response = await firstValueFrom(
      this.http.post<ApiSuccessEnvelope<InviteLink>>(
        `/api/v1/groups/${encodeURIComponent(groupId)}/members/invite-link`,
        null,
      ),
    );
    return response.data;
  }

  async getLink(code: string): Promise<InviteLinkPreview> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiSuccessEnvelope<InviteLinkPreview>>(
          `/api/v1/invite-links/${encodeURIComponent(code)}`,
        ),
      );
      return response.data;
    } catch (error) {
      throw toUnavailable(error);
    }
  }

  async join(code: string): Promise<JoinedMembership> {
    try {
      const response = await firstValueFrom(
        this.http.post<ApiSuccessEnvelope<JoinedMembership>>(
          `/api/v1/invite-links/${encodeURIComponent(code)}/join`,
          null,
        ),
      );
      return response.data;
    } catch (error) {
      throw toUnavailable(error);
    }
  }
}
