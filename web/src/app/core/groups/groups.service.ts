import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  ApiErrorEnvelope,
  ApiSuccessEnvelope,
  GroupMember,
  GroupSummary,
  Invitation,
  InvitationRequest,
  MemberRole,
  GroupChangesRequest,
  NewGroupRequest,
  RoleChangeRequest,
} from '../../shared/api';
import { TEXTS } from '../../shared/texts';

/** Errores de validación del backend al crear un grupo, ya en español y por campo. */
export class GroupValidationError extends Error {
  constructor(readonly fieldErrors: Record<string, string>) {
    super('VALIDATION_ERROR');
  }
}

/** El grupo no existe o no eres miembro (404 GROUP_NOT_FOUND); el backend no distingue los casos. */
export class GroupNotFoundError extends Error {
  constructor() {
    super('GROUP_NOT_FOUND');
  }
}

/** El rol del actor ya no le permite editar el grupo (403 PERMISSION_DENIED). */
export class GroupEditDeniedError extends Error {
  constructor() {
    super('PERMISSION_DENIED');
  }
}

/** El backend rechazó la invitación por una regla de negocio; `message` ya está en español. */
export class InvitationRejectedError extends Error {}

/** El backend rechazó el cambio de rol por una regla de negocio; `message` ya está en español. */
export class MemberRoleChangeRejectedError extends Error {}

/** El backend rechazó la remoción por una regla de negocio; `message` ya está en español. */
export class MemberRemovalRejectedError extends Error {}

/** El backend no dejó salir del grupo por una regla de negocio; `message` ya está en español. */
export class LeaveGroupRejectedError extends Error {}

/** El código de error del sobre estándar, si la respuesta lo trae. */
function errorCodeOf(error: unknown): string | undefined {
  return error instanceof HttpErrorResponse
    ? (error.error as Partial<ApiErrorEnvelope> | null)?.error?.code
    : undefined;
}

/**
 * Un rechazo de negocio con mensaje propio en `messages` se convierte en `RejectedError` con ese
 * texto (ya en español); cualquier otro error se devuelve tal cual, para relanzarlo.
 */
function rejectionFrom(
  error: unknown,
  messages: Record<string, string>,
  RejectedError: new (message: string) => Error,
): unknown {
  const code = errorCodeOf(error);
  const message = code === undefined ? undefined : messages[code];
  return message === undefined ? error : new RejectedError(message);
}

/**
 * Un `400 VALIDATION_ERROR` al crear o editar un grupo se convierte en `GroupValidationError`, con un
 * mensaje en español por campo; cualquier otro error se devuelve tal cual, para relanzarlo.
 */
function toGroupValidationError(error: unknown): unknown {
  const body =
    error instanceof HttpErrorResponse && error.status === 400
      ? (error.error as Partial<ApiErrorEnvelope> | null)
      : null;
  if (body?.error?.code !== 'VALIDATION_ERROR') {
    return error;
  }
  const fieldErrors: Record<string, string> = {};
  for (const detail of body.error.details ?? []) {
    if (detail.field) {
      fieldErrors[detail.field] =
        TEXTS.groups.errors[detail.reason ?? 'unknown'] ?? TEXTS.groups.errors['unknown'];
    }
  }
  return new GroupValidationError(fieldErrors);
}

function toGroupNotFound(error: unknown): unknown {
  return error instanceof HttpErrorResponse && error.status === 404
    ? new GroupNotFoundError()
    : error;
}

@Injectable({ providedIn: 'root' })
export class GroupsService {
  private readonly http = inject(HttpClient);

  async getGroup(groupId: string): Promise<GroupSummary> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiSuccessEnvelope<GroupSummary>>(`/api/v1/groups/${groupId}`),
      );
      return response.data;
    } catch (error) {
      throw toGroupNotFound(error);
    }
  }

  async updateGroup(groupId: string, request: GroupChangesRequest): Promise<GroupSummary> {
    try {
      const response = await firstValueFrom(
        this.http.patch<ApiSuccessEnvelope<GroupSummary>>(`/api/v1/groups/${groupId}`, request),
      );
      return response.data;
    } catch (error) {
      if (errorCodeOf(error) === 'PERMISSION_DENIED') {
        throw new GroupEditDeniedError();
      }
      throw toGroupNotFound(toGroupValidationError(error));
    }
  }

  async listMembers(groupId: string): Promise<GroupMember[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiSuccessEnvelope<GroupMember[]>>(`/api/v1/groups/${groupId}/members`),
      );
      return response.data;
    } catch (error) {
      throw toGroupNotFound(error);
    }
  }

  async inviteMember(groupId: string, request: InvitationRequest): Promise<Invitation> {
    try {
      const response = await firstValueFrom(
        this.http.post<ApiSuccessEnvelope<Invitation>>(
          `/api/v1/groups/${groupId}/members/invitations`,
          request,
        ),
      );
      return response.data;
    } catch (error) {
      throw rejectionFrom(error, TEXTS.groups.inviteErrors, InvitationRejectedError);
    }
  }

  /** Si ya no eras miembro (te removieron o saliste en otra pestaña), el resultado es el mismo: ya no estás. */
  async leaveGroup(groupId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post<ApiSuccessEnvelope<GroupMember>>(`/api/v1/groups/${groupId}/leave`, null),
      );
    } catch (error) {
      if (errorCodeOf(error) === 'GROUP_NOT_FOUND') {
        return;
      }
      throw rejectionFrom(error, TEXTS.groups.leaveGroupErrors, LeaveGroupRejectedError);
    }
  }

  async removeMember(groupId: string, userId: string): Promise<GroupMember> {
    try {
      const response = await firstValueFrom(
        this.http.delete<ApiSuccessEnvelope<GroupMember>>(
          `/api/v1/groups/${groupId}/members/${userId}`,
        ),
      );
      return response.data;
    } catch (error) {
      throw rejectionFrom(error, TEXTS.groups.removeMemberErrors, MemberRemovalRejectedError);
    }
  }

  async changeMemberRole(groupId: string, userId: string, role: MemberRole): Promise<GroupMember> {
    const request: RoleChangeRequest = { role };
    try {
      const response = await firstValueFrom(
        this.http.patch<ApiSuccessEnvelope<GroupMember>>(
          `/api/v1/groups/${groupId}/members/${userId}`,
          request,
        ),
      );
      return response.data;
    } catch (error) {
      throw rejectionFrom(error, TEXTS.groups.changeRoleErrors, MemberRoleChangeRejectedError);
    }
  }

  async listGroups(): Promise<GroupSummary[]> {
    const response = await firstValueFrom(
      this.http.get<ApiSuccessEnvelope<GroupSummary[]>>('/api/v1/groups'),
    );
    return response.data;
  }

  async createGroup(request: NewGroupRequest): Promise<GroupSummary> {
    try {
      const response = await firstValueFrom(
        this.http.post<ApiSuccessEnvelope<GroupSummary>>('/api/v1/groups', request),
      );
      return response.data;
    } catch (error) {
      throw toGroupValidationError(error);
    }
  }
}
