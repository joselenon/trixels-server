// In order to deep verification, use common function 'validateAuth' (validates user in DB)
import jwt from 'jsonwebtoken';

import { AuthError, JWTExpiredError } from '../config/errors/classes/ClientErrors';
import { IUserJWTPayload } from '../config/interfaces/IUser';
import { InvalidJWTError } from '../config/errors/classes/SystemErrors';
import TokensConfig from '../config/app/TokensConfig';

export interface IJWTService {
  signJWT(payload: IUserJWTPayload): string | undefined;
  validateJWT(args: {
    token: string;
    mustBeAuth: boolean;
    /* secretOrPublicKey?: string | undefined; */
  }): IUserJWTPayload | undefined;
}

class JWTService implements IJWTService {
  signJWT(payload: IUserJWTPayload) {
    const token = jwt.sign(payload, TokensConfig.JWT.secret, {
      expiresIn: TokensConfig.JWT.expirationInSec,
    });

    return token;
  }

  validateJWT(args: {
    token: string | undefined;
    mustBeAuth: boolean;
    /* secretOrPublicKey?: string | undefined; */
  }): IUserJWTPayload | undefined {
    try {
      const { mustBeAuth, token } = args;

      if (!token && mustBeAuth) throw new AuthError();
      if (!token && !mustBeAuth) return;

      let filteredToken = token;

      if (filteredToken && filteredToken.includes('Bearer')) {
        filteredToken = filteredToken.split('Bearer ')[1];
      } else {
        throw new InvalidJWTError();
      }

      if (!filteredToken) {
        if (mustBeAuth) throw new AuthError();
        return;
      }

      const validated = jwt.verify(filteredToken, TokensConfig.JWT.secret);

      return validated as IUserJWTPayload;
    } catch (err: any) {
      const error = err as Error;
      if (error.name === 'TokenExpiredError') throw new JWTExpiredError();
      throw err;
    }
  }
}

export default new JWTService();
