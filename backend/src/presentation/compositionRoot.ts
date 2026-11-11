import { Express } from 'express';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createApp } from './http/createApp';
import { AuthenticationProvider } from '../domain/auth/AuthenticationProvider';
import { UnauthenticatedException } from '../domain/auth/errors';
import { FirestoreUserRepository } from '../infrastructure/firestore/FirestoreUserRepository';
import { FirestoreAuditLogWriter } from '../infrastructure/audit/FirestoreAuditLogWriter';
import { GetCurrentUserProfileUseCase } from '../application/user/GetCurrentUserProfileUseCase';

export function composeApp(): Express {
  if (getApps().length === 0) {
    initializeApp();
  }
  const firestore = getFirestore();
  // Transitorio (Task 3 → Task 4): el Worker con Better Auth reemplaza esta composición.
  const authenticationProvider: AuthenticationProvider = {
    resolveSession: () =>
      Promise.reject(new UnauthenticatedException('autenticación no configurada.')),
  };
  const auditLogWriter = new FirestoreAuditLogWriter(firestore);
  const userRepository = new FirestoreUserRepository(firestore);
  const getCurrentUserProfileUseCase = new GetCurrentUserProfileUseCase(
    userRepository,
    () => new Date(),
  );

  return createApp({
    authenticationProvider,
    auditLogWriter,
    getCurrentUserProfileUseCase,
  });
}
