// Otimizar tipagem (Priority: **)
import * as admin from 'firebase-admin';

import IFirebaseQueryResponse, {
  TDBCollections,
} from '../config/interfaces/IFirebase';
import {
  DocumentNotFoundError,
  UnexpectedDatabaseError,
} from '../config/errors/classes/SystemErrors';
import { firebaseApp } from '..';

export default class FirestoreService {
  public firestore: FirebaseFirestore.Firestore;

  constructor() {
    this.firestore = firebaseApp.firestore();
  }

  async writeDocument<T extends admin.firestore.DocumentData>(
    collection: TDBCollections,
    payload: T,
  ): Promise<string> {
    try {
      const docRef = await this.firestore.collection(collection).add(payload);
      return docRef.id;
    } catch (err: any) {
      throw new UnexpectedDatabaseError(err);
    }
  }

  // Specific query (if the document doesn't exists, it throws an error)
  // IMPORTANT: It throws error in case a docRef.get is requested with an nonexistent docId in db
  async updateDocument<R>(
    collection: TDBCollections,
    docId: string,
    payload: any,
  ): Promise<IFirebaseQueryResponse<R>> {
    try {
      const docRef = await this.firestore.collection(collection).doc(docId);
      const docSnapshot = await docRef.get();
      if (!docSnapshot.exists) throw new DocumentNotFoundError();

      const docData = docSnapshot.data();
      await docRef.update(payload);
      return { docId, result: { ...docData, ...payload } as R };
    } catch (err: any) {
      throw new UnexpectedDatabaseError(err);
    }
  }

  // Specific query (if the document doesn't exists, it throws an error)
  // IMPORTANT: It throws error in case a docRef.get is requested with an nonexistent docId in db
  async getDocumentRef<R, D>(
    collection: TDBCollections,
    docId: string,
  ): Promise<IFirebaseQueryResponse<R, D>> {
    try {
      const docRef = this.firestore.collection(collection).doc(docId);

      const docSnapshot = await docRef.get();
      if (!docSnapshot.exists) throw new DocumentNotFoundError();

      const docSnapshotData = docSnapshot.data()!;

      return {
        docId,
        result:
          docRef as admin.firestore.DocumentReference<admin.firestore.DocumentData> as R,
        data: docSnapshotData as D,
      };
    } catch (err: any) {
      throw new UnexpectedDatabaseError(err);
    }
  }

  async getDocumentById<R>(
    collection: TDBCollections,
    docId: string,
  ): Promise<IFirebaseQueryResponse<R> | null> {
    try {
      const docRef = this.firestore.collection(collection).doc(docId);
      const docSnapshot = await docRef.get();
      if (!docSnapshot.exists) return null;

      const docData = docSnapshot.data();
      return { docId, result: { ...docData } as R };
    } catch (err: any) {
      throw new UnexpectedDatabaseError(err);
    }
  }

  async getSingleDocumentByParam<R>(
    collection: TDBCollections,
    param: string,
    paramValue: string,
  ): Promise<IFirebaseQueryResponse<R> | null> {
    try {
      const docRef = await this.firestore
        .collection(collection)
        .where(param, '==', paramValue)
        .limit(1);
      const docSnapshot = await docRef.get();

      if (!docSnapshot.empty) {
        const docId = docSnapshot.docs[0].id;
        const docSnapshotData = docSnapshot.docs[0].data();
        return {
          docId: docId as string,
          result: { ...docSnapshotData } as R,
        };
      } else {
        return null;
      }
    } catch (err: any) {
      throw new UnexpectedDatabaseError(err);
    }
  }

  async getManyDocumentsByParam<R>(
    collection: TDBCollections,
    param: string,
    paramValue: string | any,
  ): Promise<IFirebaseQueryResponse<R>[] | null> {
    try {
      const docRef = await this.firestore
        .collection(collection)
        .where(param, '==', paramValue);

      const docSnapshot = (await docRef.get()).docs;

      const docsDataPromise = docSnapshot.map(async (doc) => {
        const docResult = doc.data();
        const obj: IFirebaseQueryResponse<R> = {
          docId: doc.id,
          result: docResult as R,
        };
        return obj;
      });

      const docsData = await Promise.all(docsDataPromise);
      return docsData.length > 0 ? docsData : null;
    } catch (err: any) {
      throw new UnexpectedDatabaseError(err);
    }
  }
}
