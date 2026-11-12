/** Tipos de la API del Worker (docs/api/openapi.yaml, docs/api/Auth.md). */

export const SUPPORTED_CURRENCIES = ['COP', 'USD', 'EUR', 'MXN', 'GTQ'] as const;
export const SUPPORTED_LANGUAGES = ['es', 'en'] as const;

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  photoUrl: string | null;
  preferredCurrency: string;
  language: string;
  timeZone: string;
  status: 'ACTIVE' | 'DISABLED';
  createdAt: string;
  updatedAt: string;
}

/** Campos que el usuario puede cambiar con PATCH /api/v1/me. La foto viene de Google. */
export interface ProfileChanges {
  displayName: string;
  preferredCurrency: string;
  language: string;
  timeZone: string;
}

export interface ApiSuccessEnvelope<T> {
  data: T;
  meta: { requestId: string };
}

export interface ApiErrorDetail {
  field?: string;
  reason?: string;
}

export interface ApiErrorEnvelope {
  error: { code: string; message: string; details?: ApiErrorDetail[] };
  meta?: { requestId?: string };
}
