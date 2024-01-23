export interface IFirebaseQueryResponse<R, D = undefined> {
  docId: string;
  result: R;
  docData?: D;
}

export interface IFirebaseAllDocumentsByCollectionQueryResponse<R> {
  result: { docId: string; docData: R }[];
}

// Custom (modify when needed)
export type TDBCollections = 'usersResources' | 'users' | 'multiesRefs';
