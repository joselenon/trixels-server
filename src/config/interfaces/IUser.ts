import { IFirebaseResponse } from './IFirebase';

export interface IUser {
  username: string;
  password: string | null;
  avatar: string;
  balance: number;
  email: {
    value: string;
    lastEmail: string;
    updatedAt: number;
    verified: boolean;
    verifiedAt?: number;
    googleSub: string | null /* Unique id to identify an user despite an email change */;
  };
  roninWallet: {
    value?: string;
    lastWallet?: string;
    updatedAt: number;
    verified: boolean;
    verifiedAt?: number;
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
    googleSub: string | null;
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
