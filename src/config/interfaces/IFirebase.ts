export interface IFirebaseResponse<D = undefined> {
  docId: string;
  docData: D;
  docRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
}

export interface IFirebaseManyDocumentsResponse<R> {
  docId: string;
  docData: R;
  docRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
}

export interface IFirebaseAllDocumentsByCollectionQueryResponse<R> {
  result: { docId: string; docData: R }[];
}

// Custom (modify when needed)
export type TDBGamesCollections = 'raffles' | 'jackpots';

export type TDBCollections =
  | 'users'
  | 'multies'
  | 'transactions'
  | 'bets'
  | 'raffles'
  | 'jackpots'
  | 'ethereumDepositWallets'
  | 'differentActivities'
  | 'redemptionCodes';

export type DbChangeFunction = (transaction: FirebaseFirestore.Transaction, args: any[]) => Promise<void>;
