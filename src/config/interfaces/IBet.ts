import { IJackpotBetPayload } from './IPayloads';
import { IUserJWTPayload } from './IUser';

export interface IBetControllerGQL {
  makeBetOnJackpot(userInfo: IUserJWTPayload, payload: IJackpotBetPayload): Promise<void>;
}

export interface IBetRedisCreate {
  userInfo: IUserJWTPayload;
  intervals?: number[];
  amountBet: number;
  gameId: string;
  createdAt: number;
}

export interface IBetInDB {
  createdAt: number;
  amountBet: number;
  info: { randomTicket: boolean; ticket: number; type: 'raffles' | 'jackpots' };
  prize: number;
  gameRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
  userRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
}

export interface IBetToFrontEnd {
  amountBet: number;
  createdAt: number;
  gameId: string;
  info: { randomTicket: boolean; ticket: number; type: 'raffles' | 'jackpots' };
  prize: number;
  userRef: {
    avatar: string;
    username: string;
    userId: string;
  };
}

/* NOT UPDATED */
// Difference between this and 'IBetRedisCreate' is that this one has docId (since it was created later)
/*
export interface IBetRedis {
  docId: string;
  intervals: number[];
  amountBet: number;
  createdAt: number;
  gameId: string;
  userInfo: IUserJWTPayload;
}
 */
