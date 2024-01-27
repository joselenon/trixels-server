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

export interface IBetDB {
  amountBet: number;
  amountReceived: number;
  createdAt: number;
  gameId: string;
  intervals: number[];
  userRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
}

// Difference between this and 'IBetRedisCreate' is that this one has docId (since it was created later)
export interface IBetRedis {
  docId: string;
  intervals: number[];
  amountBet: number;
  createdAt: number;
  gameId: string;
  userInfo: IUserJWTPayload;
}
