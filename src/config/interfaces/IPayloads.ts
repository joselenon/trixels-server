export interface ICreateUserPayload {
  username: string;
  steamid?: string;
  avatar: string;
  balance: number;
  tradeLink?: string;
  email?: string;
}

export interface IUpdateUserPayload {
  email?: string;
  tradeLink?: string;
}

export interface IRedeemCodePayload {
  code: string;
}

export interface ICreateTransactionPayload {
  method: 'code' | 'pix';
  type: 'deposit' | 'withdraw';
  userRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
  value: number;
  createdAt: number;
}

export interface IJackpotBetPayload {
  amountBet: number;
}

export type TPayloads =
  | ICreateUserPayload
  | IUpdateUserPayload
  | IRedeemCodePayload;
