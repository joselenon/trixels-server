// Otimizar tipagem (Priority: **)
import * as admin from 'firebase-admin';

import {
  IFirebaseAllDocumentsByCollectionQueryResponse,
  IFirebaseManyDocumentsResponse,
  IFirebaseResponse,
  TDBCollections,
} from '../config/interfaces/IFirebase';
import { DocumentNotFoundError, UnexpectedDatabaseError } from '../config/errors/classes/SystemErrors';
import { firebaseApp } from '../config/app/FirebaseCredentials';

export default class FirestoreService {
  public firestore: FirebaseFirestore.Firestore;

  constructor() {
    this.firestore = firebaseApp.firestore();
  }

  async writeDocument<T extends admin.firestore.DocumentData>(
    collection: TDBCollections,
    payload: T,
  ): Promise<{ docId: string; success: boolean }> {
    try {
      const docRef = await this.firestore.collection(collection).add(payload);
      return { docId: docRef.id, success: true };
    } catch (error: any) {
      throw new UnexpectedDatabaseError(error);
    }
  }

  // Specific query (if the document doesn't exists, it throws an error)
  // IMPORTANT: It throws error in case a docRef.get is requested with an nonexistent docId in db
  async writeDocumentWithSpecificId<T extends admin.firestore.DocumentData>(
    collection: TDBCollections,
    docId: string,
    payload: T,
  ): Promise<string> {
    try {
      const docRef = this.firestore.collection(collection).doc(docId);
      await docRef.set(payload);

      return docRef.id;
    } catch (error: any) {
      throw new UnexpectedDatabaseError(error);
    }
  }

  // Specific query (if the document doesn't exists, it throws an error)
  // IMPORTANT: It throws error in case a docRef.get is requested with an nonexistent docId in db
  async updateDocument<R>(
    collection: TDBCollections,
    docId: string,
    payload: any /* MUDAR ISSO IMEDIATAMENTE */,
  ): Promise<IFirebaseResponse<R>> {
    try {
      const docRef = await this.firestore.collection(collection).doc(docId);
      const docSnapshot = await docRef.get();
      if (!docSnapshot.exists) throw new DocumentNotFoundError();

      const docData = docSnapshot.data();
      await docRef.update(payload);
      return { docId, docRef, docData: { ...docData, ...payload } as R };
    } catch (error: any) {
      throw new UnexpectedDatabaseError(error);
    }
  }

  // Specific query (if the document doesn't exists, it throws an error)
  // IMPORTANT: It throws error in case a docRef.get is requested with an nonexistent docId in db
  async getDocumentRefWithData<D>(collection: TDBCollections, docId: string): Promise<IFirebaseResponse<D>> {
    try {
      const docRef = this.firestore.collection(collection).doc(docId);

      const docSnapshot = await docRef.get();
      if (!docSnapshot.exists) throw new DocumentNotFoundError();

      const docSnapshotData = docSnapshot.data()!;

      return {
        docId,
        docRef,
        docData: docSnapshotData as D,
      };
    } catch (error: any) {
      throw new UnexpectedDatabaseError(error);
    }
  }

  async getDocumentById<R>(collection: TDBCollections, docId: string): Promise<IFirebaseResponse<R> | null> {
    try {
      const docRef = this.firestore.collection(collection).doc(docId);
      const docSnapshot = await docRef.get();

      if (!docSnapshot.exists) return null;

      const docData = docSnapshot.data();
      return { docId, docRef, docData: { ...docData } as R };
    } catch (error: any) {
      throw new UnexpectedDatabaseError(error);
    }
  }

  async getSingleDocumentByParam<R>(
    collection: TDBCollections,
    param: string,
    paramValue: string | admin.firestore.DocumentReference<admin.firestore.DocumentData>,
  ): Promise<IFirebaseResponse<R> | null> {
    try {
      const docQuery = await this.firestore.collection(collection).where(param, '==', paramValue).limit(1);
      const docSnapshot = await docQuery.get();
      if (docSnapshot.empty) return null;

      const queryDocSnapshot = docSnapshot.docs[0];
      const docId = queryDocSnapshot.id;
      const docSnapshotData = queryDocSnapshot.data();
      const docRef = queryDocSnapshot.ref;

      return {
        docId: docId as string,
        docRef,
        docData: { ...docSnapshotData } as R,
      };
    } catch (error: any) {
      throw new UnexpectedDatabaseError(error);
    }
  }

  async getManyDocumentsByParam<R>(
    collection: TDBCollections,
    param: string,
    paramValue: any,
  ): Promise<IFirebaseManyDocumentsResponse<R>> {
    try {
      const docQuery = this.firestore.collection(collection).where(param, '==', paramValue);
      const querySnapshot = await docQuery.get();
      if (querySnapshot.empty) return { documents: [] };

      const documents = querySnapshot.docs.map((doc) => {
        const docData = doc.data() as R;
        const docRef = doc.ref;
        return {
          docId: doc.id,
          docData,
          docRef,
        };
      });

      return { documents };
    } catch (error: any) {
      throw new UnexpectedDatabaseError(error);
    }
  }

  async getAllDocumentsByCollection<R>(
    collection: TDBCollections,
  ): Promise<IFirebaseAllDocumentsByCollectionQueryResponse<R> | null> {
    try {
      const collectionRef = this.firestore.collection(collection);
      const collectionSnapshot = await collectionRef.get();

      if (collectionSnapshot.empty) return null;

      const collectionDocsData = collectionSnapshot.docs.map((doc) => {
        return { docId: doc.id, docData: doc.data() as R };
      });
      return { result: collectionDocsData };
    } catch (error: any) {
      throw new UnexpectedDatabaseError(error);
    }
  }

  async pushToArrayProperty(collection: TDBCollections, docId: string, arrayField: string, value: any): Promise<void> {
    try {
      const docRef = this.firestore.collection(collection).doc(docId);

      await this.firestore.runTransaction(async (transaction) => {
        const doc = await transaction.get(docRef);
        if (!doc.exists) {
          throw new DocumentNotFoundError(`Document ${docId} not found`);
        }

        const docData = doc.data();
        if (!docData) {
          throw new UnexpectedDatabaseError(`Document ${docId} has no data`);
        }

        // Verificar se o campo é um array
        if (!Array.isArray(docData[arrayField])) {
          throw new UnexpectedDatabaseError(`Field ${arrayField} is not an array`);
        }

        // Adicionar o valor ao array
        transaction.update(docRef, {
          [arrayField]: admin.firestore.FieldValue.arrayUnion(value),
        });
      });
    } catch (error: any) {
      throw new UnexpectedDatabaseError(error);
    }
  }

  async getCollectionRef(
    collection: TDBCollections,
  ): Promise<admin.firestore.CollectionReference<admin.firestore.DocumentData>> {
    try {
      return this.firestore.collection(collection);
    } catch (error: any) {
      throw new UnexpectedDatabaseError(error);
    }
  }

  async getManyDocumentsByParamInChunks<R>({
    collection,
    param,
    paramValue,
    orderByField,
    chunkSize,
    config,
  }: {
    collection: TDBCollections;
    param: string;
    paramValue: any;
    orderByField: string;
    chunkSize: number;
    config: { forward: boolean; startAfterDocTimestamp?: number };
  }): Promise<IFirebaseManyDocumentsResponse<R>> {
    try {
      const { forward, startAfterDocTimestamp } = config;

      let query = this.firestore
        .collection(collection)
        .where(param, '==', paramValue)
        .orderBy(orderByField, 'desc')
        .limit(chunkSize + 1); // +1 para verificar se há mais documentos

      if (forward && startAfterDocTimestamp) {
        query = query.startAfter(startAfterDocTimestamp);
      }
      if (!forward && startAfterDocTimestamp) {
        query = query.endBefore(startAfterDocTimestamp);
      }

      const snapshot = await query.get();

      if (snapshot.empty) return { documents: [], hasMore: false };

      const documents = snapshot.docs.slice(0, chunkSize).map((doc) => ({
        docId: doc.id,
        docData: doc.data() as R,
        docRef: doc.ref,
      }));

      const hasMore = snapshot.docs.length > chunkSize;

      return { documents, hasMore };
    } catch (error: any) {
      throw new UnexpectedDatabaseError(error);
    }
  }
}
