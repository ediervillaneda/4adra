import { Handler } from 'hono';
import { AppEnv } from '../AppEnv';
import { CreateGroupUseCase } from '../../../application/group/CreateGroupUseCase';
import { ListMyGroupsUseCase } from '../../../application/group/ListMyGroupsUseCase';
import { GetGroupUseCase } from '../../../application/group/GetGroupUseCase';
import { ListGroupMembersUseCase } from '../../../application/group/ListGroupMembersUseCase';
import { InviteMemberUseCase } from '../../../application/invitation/InviteMemberUseCase';
import { readJsonBody } from '../readJsonBody';
import { successEnvelope } from '../responseEnvelope';

export function createPostGroupsHandler(useCase: CreateGroupUseCase): Handler<AppEnv> {
  return async (c) => {
    const group = await useCase.execute({ actor: c.get('actor'), input: await readJsonBody(c) });
    return c.json(successEnvelope(group, c.get('requestId')), 201);
  };
}

export function createGetGroupHandler(
  useCase: GetGroupUseCase,
): Handler<AppEnv, '/v1/groups/:groupId'> {
  return async (c) => {
    const group = await useCase.execute({ actor: c.get('actor'), groupId: c.req.param('groupId') });
    return c.json(successEnvelope(group, c.get('requestId')), 200);
  };
}

export function createGetGroupMembersHandler(
  useCase: ListGroupMembersUseCase,
): Handler<AppEnv, '/v1/groups/:groupId/members'> {
  return async (c) => {
    const members = await useCase.execute({
      actor: c.get('actor'),
      groupId: c.req.param('groupId'),
    });
    return c.json(successEnvelope(members, c.get('requestId')), 200);
  };
}

export function createPostInvitationHandler(
  useCase: InviteMemberUseCase,
): Handler<AppEnv, '/v1/groups/:groupId/members/invitations'> {
  return async (c) => {
    const invitation = await useCase.execute({
      actor: c.get('actor'),
      groupId: c.req.param('groupId'),
      input: await readJsonBody(c),
    });
    return c.json(successEnvelope(invitation, c.get('requestId')), 201);
  };
}

export function createGetGroupsHandler(useCase: ListMyGroupsUseCase): Handler<AppEnv> {
  return async (c) => {
    const groups = await useCase.execute({ actor: c.get('actor') });
    return c.json(successEnvelope(groups, c.get('requestId')), 200);
  };
}
