// In order to deep verification, use common function 'validateAuth' (validates user in DB)
import jwt from 'jsonwebtoken';

import JWTConfig from '../config/app/JWTConfig';
import { IJWTService } from '../config/interfaces/IJWT';
import { AuthError, JWTExpiredError } from '../config/errors/classes/ClientErrors';
import { IUserJWTPayload } from '../config/interfaces/IUser';

class JWTService implements IJWTService {
  signJWT(payload: IUserJWTPayload) {
    const token = jwt.sign(payload, JWTConfig.secret, {
      expiresIn: JWTConfig.expiration,
    });

    return token;
  }

  validateJWT(
    token: string | undefined,
    secretOrPublicKey?: jwt.Secret,
  ): IUserJWTPayload {
    try {
      if (!token) throw new AuthError();

      let filteredToken = token;

      if (filteredToken.includes('Bearer')) {
        filteredToken = token.split('Bearer ')[1];
      }

      const validated = jwt.verify(
        filteredToken,
        secretOrPublicKey ? secretOrPublicKey : JWTConfig.secret,
      );

      if (!validated) throw new AuthError();

      return validated as IUserJWTPayload;
    } catch (err: any) {
      const error = err as Error;

      if (error.name === 'TokenExpiredError') throw new JWTExpiredError();
      throw err;
    }
  }
}

export default new JWTService();
