import { IFirebaseQueryResponse } from './IFirebase';

export interface IUser {
  username: string;
  password: string;
  avatar: string;
  balance: number;
  email: {
    value: string;
    verified: boolean;
    lastEmail: string;
    updatedAt: number;
  };
  roninWallet: {
    value?: string;
    lastWallet?: string;
    updatedAt: number;
  };
  createdAt: number;
}

export interface IUserJWTPayload {
  userDocId: string;
  username: string;
  avatar?: string;
}

export interface IUserToFrontEnd {
  username: string;
  avatar: string;
  balance?: number;
  email?: {
    value: string;
    verified: boolean;
    lastEmail: string;
    updatedAt: number;
  };
  roninWallet: {
    value?: string;
  };
  createdAt: number;
}

export interface IUserControllerGQL {
  getUser(steamid: string): Promise<IFirebaseQueryResponse<IUser> | null>;
}
