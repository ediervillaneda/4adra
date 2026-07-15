import { onRequest } from 'firebase-functions/v2/https';
import { composeApp } from './presentation/compositionRoot';

export const api = onRequest(composeApp());
