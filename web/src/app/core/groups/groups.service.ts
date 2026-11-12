import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  ApiErrorEnvelope,
  ApiSuccessEnvelope,
  GroupMember,
  GroupSummary,
  NewGroupRequest,
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
      const body =
        error instanceof HttpErrorResponse && error.status === 400
          ? (error.error as Partial<ApiErrorEnvelope> | null)
          : null;
      if (body?.error?.code === 'VALIDATION_ERROR') {
        const fieldErrors: Record<string, string> = {};
        for (const detail of body.error.details ?? []) {
          if (detail.field) {
            fieldErrors[detail.field] =
              TEXTS.groups.errors[detail.reason ?? 'unknown'] ?? TEXTS.groups.errors['unknown'];
          }
        }
        throw new GroupValidationError(fieldErrors);
      }
      throw error;
    }
  }
}
