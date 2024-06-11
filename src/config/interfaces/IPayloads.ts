export interface ICreateUserPayload {
  username: string;
}

export interface IUserUpdatePayload {
  email: {
    value: string;
    verified: boolean;
    lastEmail: string;
    updatedAt: number;
  };
  ronin_wallet: {
    value: string;
    lastWallet: string;
    updatedAt: number;
  };
}

export interface IUserUpdateBalance {
  balance: number;
}

export interface IRedeemCodePayload {
  code: string;
}

export interface IJackpotBetPayload {
  amountBet: number;
}

export type TPayloads = ICreateUserPayload | IUserUpdatePayload | IRedeemCodePayload;
export type TUpdatePayloads = IUserUpdatePayload | IUserUpdateBalance;
