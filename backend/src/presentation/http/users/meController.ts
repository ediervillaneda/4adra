import { Handler } from 'hono';
import { AppEnv } from '../AppEnv';
import { GetCurrentUserProfileUseCase } from '../../../application/user/GetCurrentUserProfileUseCase';
import { successEnvelope } from '../responseEnvelope';

export function createGetMeHandler(useCase: GetCurrentUserProfileUseCase): Handler<AppEnv> {
  return async (c) => {
    const profile = await useCase.execute({ actor: c.get('actor') });
    return c.json(successEnvelope(profile, c.get('requestId')), 200);
  };
}
