// Otimizar tipagem (Priority: **)
import * as admin from 'firebase-admin';

import {
  IFirebaseAllDocumentsByCollectionQueryResponse,
  IFirebaseManyDocumentsResponse,
  IFirebaseResponse,
  TDBCollections,
} from '../config/interfaces/IFirebase';
import { DocumentNotFoundError, UnexpectedDatabaseError } from '../config/errors/classes/SystemErrors';
import { firebaseApp } from '..';

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
    } catch (err: any) {
      throw new UnexpectedDatabaseError(err);
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
    } catch (err: any) {
      throw new UnexpectedDatabaseError(err);
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
    } catch (err: any) {
      throw new UnexpectedDatabaseError(err);
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
    } catch (err: any) {
      throw new UnexpectedDatabaseError(err);
    }
  }

  async getDocumentById<R>(collection: TDBCollections, docId: string): Promise<IFirebaseResponse<R> | null> {
    try {
      const docRef = this.firestore.collection(collection).doc(docId);
      const docSnapshot = await docRef.get();

      if (!docSnapshot.exists) return null;

      const docData = docSnapshot.data();
      return { docId, docRef, docData: { ...docData } as R };
    } catch (err: any) {
      throw new UnexpectedDatabaseError(err);
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
    } catch (err: any) {
      throw new UnexpectedDatabaseError(err);
    }
  }

  async getManyDocumentsByParam<R>(
    collection: TDBCollections,
    param: string,
    paramValue: any,
  ): Promise<IFirebaseManyDocumentsResponse<R>[] | null> {
    try {
      const docQuery = this.firestore.collection(collection).where(param, '==', paramValue);
      const querySnapshot = await docQuery.get();
      if (querySnapshot.empty) return null;

      const docsData = querySnapshot.docs.map((doc) => {
        const docData = doc.data() as R;
        const docRef = doc.ref;
        return {
          docId: doc.id,
          docData,
          docRef,
        };
      });

      return docsData;
    } catch (err: any) {
      throw new UnexpectedDatabaseError(err);
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
    } catch (err: any) {
      throw new UnexpectedDatabaseError(err);
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
    } catch (err: any) {
      throw new UnexpectedDatabaseError(err);
    }
  }

  async getCollectionRef(
    collection: TDBCollections,
  ): Promise<admin.firestore.CollectionReference<admin.firestore.DocumentData>> {
    try {
      return this.firestore.collection(collection);
    } catch (err: any) {
      throw new UnexpectedDatabaseError(err);
    }
  }

  async getManyDocumentsByParamInChunks<R>({
    collection,
    param,
    paramValue,
    orderByField,
    chunkSize,
    chunkIndex,
  }: {
    collection: TDBCollections;
    param: string;
    paramValue: any;
    orderByField: string;
    chunkSize: number;
    chunkIndex: number;
  }): Promise<IFirebaseManyDocumentsResponse<R>[]> {
    try {
      const totalSkip = chunkSize * (chunkIndex - 1);

      // Consulta inicial para determinar o ponto de início do chunk
      const initialQuery = this.firestore
        .collection(collection)
        .where(param, '==', paramValue)
        .orderBy(orderByField, 'asc')
        .limit(totalSkip + chunkSize);

      const initialSnapshot = await initialQuery.get();

      if (initialSnapshot.empty) return [];

      // Identificar o ponto inicial do chunk atual
      const startAfterDoc = totalSkip > 0 ? initialSnapshot.docs[totalSkip - 1] : null;

      // Consulta final para pegar o chunk desejado
      let finalQuery = this.firestore
        .collection(collection)
        .where(param, '==', paramValue)
        .orderBy(orderByField, 'asc')
        .limit(chunkSize);

      if (startAfterDoc) {
        finalQuery = finalQuery.startAfter(startAfterDoc);
      }

      const chunkSnapshot = await finalQuery.get();
      if (chunkSnapshot.empty) return [];

      const documents = chunkSnapshot.docs.map((doc) => {
        const docData = doc.data() as R;
        return {
          docId: doc.id,
          docData,
          docRef: doc.ref,
        };
      });

      return documents;
    } catch (err: any) {
      throw new UnexpectedDatabaseError(err);
    }
  }
}
