import { Handler } from 'hono';
import { AppEnv } from '../AppEnv';
import { CreateInviteLinkUseCase } from '../../../application/invitation/CreateInviteLinkUseCase';
import { GetInviteLinkUseCase } from '../../../application/invitation/GetInviteLinkUseCase';
import { JoinGroupWithInviteLinkUseCase } from '../../../application/invitation/JoinGroupWithInviteLinkUseCase';
import { successEnvelope } from '../responseEnvelope';

export function createPostInviteLinkHandler(
  useCase: CreateInviteLinkUseCase,
): Handler<AppEnv, '/v1/groups/:groupId/members/invite-link'> {
  return async (c) => {
    const link = await useCase.execute({ actor: c.get('actor'), groupId: c.req.param('groupId') });
    return c.json(successEnvelope(link, c.get('requestId')), 201);
  };
}

export function createGetInviteLinkHandler(
  useCase: GetInviteLinkUseCase,
): Handler<AppEnv, '/v1/invite-links/:code'> {
  return async (c) => {
    const preview = await useCase.execute({ code: c.req.param('code') });
    return c.json(successEnvelope(preview, c.get('requestId')), 200);
  };
}

export function createPostJoinWithInviteLinkHandler(
  useCase: JoinGroupWithInviteLinkUseCase,
): Handler<AppEnv, '/v1/invite-links/:code/join'> {
  return async (c) => {
    const membership = await useCase.execute({
      actor: c.get('actor'),
      code: c.req.param('code'),
    });
    return c.json(successEnvelope(membership, c.get('requestId')), 200);
  };
}
