import { Handler } from 'hono';
import { AppEnv } from '../AppEnv';
import { ListMyInvitationsUseCase } from '../../../application/invitation/ListMyInvitationsUseCase';
import { AcceptInvitationUseCase } from '../../../application/invitation/AcceptInvitationUseCase';
import { DeclineInvitationUseCase } from '../../../application/invitation/DeclineInvitationUseCase';
import { successEnvelope } from '../responseEnvelope';

export function createGetInvitationsHandler(useCase: ListMyInvitationsUseCase): Handler<AppEnv> {
  return async (c) => {
    const invitations = await useCase.execute(c.get('actor'));
    return c.json(successEnvelope(invitations, c.get('requestId')), 200);
  };
}

export function createPostAcceptInvitationHandler(
  useCase: AcceptInvitationUseCase,
): Handler<AppEnv, '/v1/invitations/:invitationId/accept'> {
  return async (c) => {
    const invitation = await useCase.execute({
      actor: c.get('actor'),
      invitationId: c.req.param('invitationId'),
    });
    return c.json(successEnvelope(invitation, c.get('requestId')), 200);
  };
}

export function createPostDeclineInvitationHandler(
  useCase: DeclineInvitationUseCase,
): Handler<AppEnv, '/v1/invitations/:invitationId/decline'> {
  return async (c) => {
    const invitation = await useCase.execute({
      actor: c.get('actor'),
      invitationId: c.req.param('invitationId'),
    });
    return c.json(successEnvelope(invitation, c.get('requestId')), 200);
  };
}
