export interface SuccessEnvelope<T> {
  data: T;
  meta: { requestId: string };
}

export interface ErrorDetail {
  field?: string;
  reason?: string;
}

export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: ErrorDetail[];
  };
  meta: { requestId: string };
}

export function successEnvelope<T>(data: T, requestId: string): SuccessEnvelope<T> {
  return { data, meta: { requestId } };
}

export function errorEnvelope(
  code: string,
  message: string,
  requestId: string,
  details?: ErrorDetail[],
): ErrorEnvelope {
  return { error: { code, message, ...(details ? { details } : {}) }, meta: { requestId } };
}
