import { IUserJWTPayload } from './IUser';

export interface IJWTService {
  signJWT(payload: IUserJWTPayload): string | undefined;
  validateJWT<T>(token: string, secretOrPublicKey: string | undefined): T;
}
