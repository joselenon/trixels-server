import { IUserJWTPayload } from './IUser';

export interface IJWTService {
  signJWT(payload: IUserJWTPayload): string | undefined;
  validateJWT(token: string, secretOrPublicKey?: string | undefined): IUserJWTPayload;
}
