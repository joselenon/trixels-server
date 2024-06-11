export interface IFirebaseQueryResponse<R> {
  docId: string;
  result: R;
}

export interface IFirebaseQueryResponseWithData<R, D = undefined> {
  docId: string;
  result: R;
  docData: D;
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
  | 'differentActivities';

export type DbChangeFunction = (transaction: FirebaseFirestore.Transaction, args: any[]) => Promise<void>;
