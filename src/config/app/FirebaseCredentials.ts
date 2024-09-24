import * as admin from 'firebase-admin';

import ENVIRONMENT from '../constants/ENVIRONMENT';

const FirebaseCredentials: admin.ServiceAccount = {
  projectId: ENVIRONMENT.FIREBASE_PROJECT_ID,
  clientEmail: ENVIRONMENT.FIREBASE_CLIENT_EMAIL,
  privateKey: ENVIRONMENT.FIREBASE_PRIVATE_KEY,
};

const firebaseApp = admin.initializeApp({
  credential: admin.credential.cert(FirebaseCredentials),
});

export { firebaseApp };
