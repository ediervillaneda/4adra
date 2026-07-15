import { Express } from 'express';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { createApp } from './http/createApp';
import { FirebaseAuthenticationProvider } from '../infrastructure/firebase/FirebaseAuthenticationProvider';
import { FirestoreUserRepository } from '../infrastructure/firestore/FirestoreUserRepository';
import { FirestoreAuditLogWriter } from '../infrastructure/audit/FirestoreAuditLogWriter';
import { GetCurrentUserProfileUseCase } from '../application/user/GetCurrentUserProfileUseCase';

export function composeApp(): Express {
  if (getApps().length === 0) {
    initializeApp();
  }
  const firestore = getFirestore();
  const authenticationProvider = new FirebaseAuthenticationProvider(getAuth());
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
