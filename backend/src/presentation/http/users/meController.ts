import { Context, Handler } from 'hono';
import { AppEnv } from '../AppEnv';
import { GetCurrentUserProfileUseCase } from '../../../application/user/GetCurrentUserProfileUseCase';
import { UpdateCurrentUserProfileUseCase } from '../../../application/user/UpdateCurrentUserProfileUseCase';
import { ValidationException } from '../../../domain/errors/ValidationException';
import { successEnvelope } from '../responseEnvelope';

export function createGetMeHandler(useCase: GetCurrentUserProfileUseCase): Handler<AppEnv> {
  return async (c) => {
    const profile = await useCase.execute({ actor: c.get('actor') });
    return c.json(successEnvelope(profile, c.get('requestId')), 200);
  };
}

async function readJsonBody(c: Context<AppEnv>): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    throw new ValidationException([{ field: 'body', reason: 'invalid_json' }]);
  }
}

export function createPatchMeHandler(useCase: UpdateCurrentUserProfileUseCase): Handler<AppEnv> {
  return async (c) => {
    const profile = await useCase.execute({
      actor: c.get('actor'),
      changes: await readJsonBody(c),
    });
    return c.json(successEnvelope(profile, c.get('requestId')), 200);
  };
}
