import { Hono } from 'hono';
import { v7 as uuidv7 } from 'uuid';
import { createApp } from './http/createApp';
import { AppEnv } from './http/AppEnv';
import { createAuth } from '../infrastructure/auth/createAuth';
import { parseTrustedOrigins } from '../infrastructure/auth/parseTrustedOrigins';
import { betterAuthSessionLookup } from '../infrastructure/auth/betterAuthSessionLookup';
import { BetterAuthAuthenticationProvider } from '../infrastructure/auth/BetterAuthAuthenticationProvider';
import { D1UserRepository } from '../infrastructure/d1/D1UserRepository';
import { D1AuditLogWriter } from '../infrastructure/d1/D1AuditLogWriter';
import { D1AllowedEmailRepository } from '../infrastructure/d1/D1AllowedEmailRepository';
import { D1GroupRepository } from '../infrastructure/d1/D1GroupRepository';
import { D1InvitationRepository } from '../infrastructure/d1/D1InvitationRepository';
import { Email } from '../domain/user/Email';
import { GetCurrentUserProfileUseCase } from '../application/user/GetCurrentUserProfileUseCase';
import { UpdateCurrentUserProfileUseCase } from '../application/user/UpdateCurrentUserProfileUseCase';
import { CreateGroupUseCase } from '../application/group/CreateGroupUseCase';
import { ListMyGroupsUseCase } from '../application/group/ListMyGroupsUseCase';
import { GetGroupUseCase } from '../application/group/GetGroupUseCase';
import { ListGroupMembersUseCase } from '../application/group/ListGroupMembersUseCase';
import { InviteMemberUseCase } from '../application/invitation/InviteMemberUseCase';
import { ListMyInvitationsUseCase } from '../application/invitation/ListMyInvitationsUseCase';
import { AcceptInvitationUseCase } from '../application/invitation/AcceptInvitationUseCase';
import { DeclineInvitationUseCase } from '../application/invitation/DeclineInvitationUseCase';

/** Único lugar que instancia dependencias concretas a partir de los bindings del Worker. */
export function composeApp(env: Env): Hono<AppEnv> {
  const allowedEmails = new D1AllowedEmailRepository(env.DB);
  const userRepository = new D1UserRepository(env.DB);
  const groupRepository = new D1GroupRepository(env.DB);
  const invitationRepository = new D1InvitationRepository(env.DB);
  const auth = createAuth({
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET },
    isSignUpAllowed: (email) => allowedEmails.isAllowed(Email.fromString(email)),
    trustedOrigins: parseTrustedOrigins(env.TRUSTED_ORIGINS),
  });

  return createApp({
    authenticationProvider: new BetterAuthAuthenticationProvider(betterAuthSessionLookup(auth)),
    auditLogWriter: new D1AuditLogWriter(env.DB, () => uuidv7()),
    getCurrentUserProfileUseCase: new GetCurrentUserProfileUseCase(
      userRepository,
      () => new Date(),
    ),
    updateCurrentUserProfileUseCase: new UpdateCurrentUserProfileUseCase(
      userRepository,
      () => new Date(),
    ),
    createGroupUseCase: new CreateGroupUseCase(
      groupRepository,
      userRepository,
      () => uuidv7(),
      () => new Date(),
    ),
    listMyGroupsUseCase: new ListMyGroupsUseCase(groupRepository),
    getGroupUseCase: new GetGroupUseCase(groupRepository),
    listGroupMembersUseCase: new ListGroupMembersUseCase(groupRepository),
    inviteMemberUseCase: new InviteMemberUseCase(
      groupRepository,
      allowedEmails,
      invitationRepository,
      () => uuidv7(),
      () => new Date(),
    ),
    listMyInvitationsUseCase: new ListMyInvitationsUseCase(invitationRepository, () => new Date()),
    acceptInvitationUseCase: new AcceptInvitationUseCase(invitationRepository, () => new Date()),
    declineInvitationUseCase: new DeclineInvitationUseCase(invitationRepository, () => new Date()),
    authHandler: (request) => auth.handler(request),
    generateRequestId: () => crypto.randomUUID(),
  });
}
