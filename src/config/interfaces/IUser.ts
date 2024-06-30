import { IFirebaseResponse } from './IFirebase';

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
    verified: boolean;
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
    verified?: boolean;
  };
  createdAt: number;
}

export interface IUserControllerGQL {
  getUser(steamid: string): Promise<IFirebaseResponse<IUser> | null>;
}
