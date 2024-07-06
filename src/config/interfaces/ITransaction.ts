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

export interface IDepositTransactionsToFrontend extends ITransactionToFrontendBase {
  fromAddress: string | null;
}
export interface ICashoutTransactionsToFrontend extends ITransactionToFrontendBase {
  toAddress: string;
}

export type TTransactionToFrontend = IDepositTransactionsToFrontend | ICashoutTransactionsToFrontend;
export type TTransactionsToFrontend = {
  transactions: (IDepositTransactionsToFrontend | ICashoutTransactionsToFrontend)[];
  hasMore?: boolean;
};
