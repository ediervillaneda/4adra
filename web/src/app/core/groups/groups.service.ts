import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  ApiErrorEnvelope,
  ApiSuccessEnvelope,
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

@Injectable({ providedIn: 'root' })
export class GroupsService {
  private readonly http = inject(HttpClient);

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
