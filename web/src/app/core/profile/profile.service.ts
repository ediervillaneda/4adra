import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  ApiErrorEnvelope,
  ApiSuccessEnvelope,
  ProfileChanges,
  UserProfile,
} from '../../shared/api';
import { TEXTS } from '../../shared/texts';

/** Errores de validación del backend, ya en español y por campo. */
export class ProfileValidationError extends Error {
  constructor(readonly fieldErrors: Record<string, string>) {
    super('VALIDATION_ERROR');
  }
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);

  async getProfile(): Promise<UserProfile> {
    const response = await firstValueFrom(
      this.http.get<ApiSuccessEnvelope<UserProfile>>('/api/v1/me'),
    );
    return response.data;
  }

  async updateProfile(changes: Partial<ProfileChanges>): Promise<UserProfile> {
    try {
      const response = await firstValueFrom(
        this.http.patch<ApiSuccessEnvelope<UserProfile>>('/api/v1/me', changes),
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
              TEXTS.profile.errors[detail.reason ?? 'unknown'] ?? TEXTS.profile.errors['unknown'];
          }
        }
        throw new ProfileValidationError(fieldErrors);
      }
      throw error;
    }
  }
}
