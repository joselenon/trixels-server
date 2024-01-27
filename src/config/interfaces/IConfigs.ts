import * as admin from 'firebase-admin';

export interface IETHDepositWalletDb {
  publicAddress: string;
  encryptedJSON: JSON;
  userRef: admin.firestore.DocumentReference<admin.firestore.DocumentData>;
  createdAt: number;
}
