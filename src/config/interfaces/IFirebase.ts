export default interface IFirebaseQueryResponse<R, D = undefined> {
  docId: string;
  result: R;
  data?: D;
}

// Custom (modify when needed)
export type TDBCollections = 'bets' | 'codes' | 'games' | 'transactions' | 'users';
