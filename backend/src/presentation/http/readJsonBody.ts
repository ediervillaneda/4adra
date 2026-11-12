import { Context } from 'hono';
import { AppEnv } from './AppEnv';
import { ValidationException } from '../../domain/errors/ValidationException';

/** Lee el cuerpo JSON de la solicitud; si no es JSON válido responde 400 VALIDATION_ERROR. */
export async function readJsonBody(c: Context<AppEnv>): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    throw new ValidationException([{ field: 'body', reason: 'invalid_json' }]);
  }
}
