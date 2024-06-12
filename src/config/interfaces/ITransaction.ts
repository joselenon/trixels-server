export interface ICreateTransactionPayload {
  createdAt: number;
  symbol: unknown;
  type: 'deposit' | 'withdraw';
  userRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData> | null;
  value: number;
}

export interface IDepositTransactionInDb {
  createdAt: number;
  symbol: 'RON' | 'PIXEL' | 'AXS' | unknown;
  type: 'deposit' | 'withdraw';
  userRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData> | null;
  value: number;
  fromAddress: string;
}
