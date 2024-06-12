export interface ICreateTransactionPayload {
  createdAt: number;
  symbol: unknown;
  type: 'deposit' | 'withdraw';
  userRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData> | null;
  value: number;
}

export interface ITransactionBase {
  createdAt: number;
  symbol: 'RON' | 'PIXEL' | 'AXS' | unknown;
  type: 'deposit' | 'withdraw';
  userRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData> | null;
  value: number;
}

export interface IDepositTransactionInDb extends ITransactionBase {
  fromAddress: string;
}

export interface ICashoutTransactionInDb extends ITransactionBase {
  toAddress: string;
}

export type TTransactionInDb = IDepositTransactionInDb | ICashoutTransactionInDb;
