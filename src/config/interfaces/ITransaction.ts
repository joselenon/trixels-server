/* BACKEND */
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
  type: 'deposit' | 'withdraw' | 'codeRedeem';
  userRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData> | null;
  value: number;
}

export interface IDepositTransactionsInDb extends ITransactionBase {
  fromAddress: string | null;
}
export interface ICashoutTransactionsInDb extends ITransactionBase {
  toAddress: string;
}
export type TTransactionsInDb = IDepositTransactionsInDb | ICashoutTransactionsInDb;

/* FRONTEND */
export interface ITransactionToFrontendBase {
  createdAt: number;
  symbol: 'RON' | 'PIXEL' | 'AXS' | unknown;
  type: 'deposit' | 'withdraw' | 'codeRedeem';
  userRef: '';
  value: number;
}

export interface IDepositTransactionsToFrontendInDb extends ITransactionToFrontendBase {
  fromAddress: string | null;
}
export interface ICashoutTransactionsToFrontendInDb extends ITransactionToFrontendBase {
  toAddress: string;
}

export type TTransactionToFrontend = IDepositTransactionsToFrontendInDb | ICashoutTransactionsToFrontendInDb;
export type TTransactionsToFrontend = (IDepositTransactionsToFrontendInDb | ICashoutTransactionsToFrontendInDb)[];
