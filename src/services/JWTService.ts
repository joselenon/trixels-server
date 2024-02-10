// In order to deep verification, use common function 'validateAuth' (validates user in DB)
import jwt from 'jsonwebtoken';

import JWTConfig from '../config/app/JWTConfig';
import { AuthError } from '../config/errors/classes/ClientErrors';
import { IUserJWTPayload } from '../config/interfaces/IUser';

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

      /* ARRUMAR ISSO. POR MAIS QUE NÃO PRECISE, É PRECISO AUTENTICAR QUEM ESTA FAZENDO A REQ. */
      if (!mustBeAuth) return;
      if (!token) throw new AuthError();

      let filteredToken = token;
      if (filteredToken.includes('Bearer')) {
        filteredToken = token.split('Bearer ')[1];
      }

      const validated = jwt.verify(filteredToken, JWTConfig.secret);
      if (!validated && mustBeAuth) throw new AuthError();

      return validated as IUserJWTPayload;
    } catch (err: any) {
      const error = err as Error;

      /* if (error.name === 'TokenExpiredError') throw new JWTExpiredError(); */
      if (error.name === 'TokenExpiredError') return undefined;
      throw err;
    }
  }
}

export default new JWTService();
