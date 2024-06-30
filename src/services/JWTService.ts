// In order to deep verification, use common function 'validateAuth' (validates user in DB)
import jwt from 'jsonwebtoken';

import JWTConfig from '../config/app/JWTConfig';
import { AuthError, JWTExpiredError } from '../config/errors/classes/ClientErrors';
import { IUserJWTPayload } from '../config/interfaces/IUser';
import { InvalidJWTError } from '../config/errors/classes/SystemErrors';

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
    const token = jwt.sign(payload, JWTConfig.secret, {
      expiresIn: JWTConfig.expiration,
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

      const validated = jwt.verify(filteredToken, JWTConfig.secret);

      if (!validated && mustBeAuth) throw new AuthError();

      return validated as IUserJWTPayload;
    } catch (err: any) {
      const error = err as Error;

      if (error.name === 'TokenExpiredError') throw new JWTExpiredError();
      throw err;
    }
  }
}

export default new JWTService();
