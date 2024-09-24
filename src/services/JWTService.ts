import jwt from 'jsonwebtoken';

import { AuthError, JWTExpiredError } from '../config/errors/classes/ClientErrors';
import { IUser, IUserJWTPayload } from '../config/interfaces/IUser';
import { BlacklistedTokenError, InvalidJWTError } from '../config/errors/classes/SystemErrors';
import TokensConfig from '../config/app/TokensConfig';
import { RedisInstance } from '..';
import getRedisKeyHelper from '../helpers/redisHelper';
import UserService from './UserService';
import { IFirebaseResponse } from '../config/interfaces/IFirebase';

export interface IJWTService {
  signJWT(payload: IUserJWTPayload): string | undefined;
  validateJWT(args: { token: string }): Promise<{ userJWTPayload: IUserJWTPayload; userDoc: IFirebaseResponse<IUser> }>;
}

class JWTService implements IJWTService {
  private validateJWTPayload(jwtPayload: IUserJWTPayload) {
    if (!jwtPayload.userDocId || !jwtPayload.username) throw new Error('Invalid jwt payload');
  }

  signJWT(payload: IUserJWTPayload) {
    const token = jwt.sign(payload, TokensConfig.JWT.secret, {
      expiresIn: TokensConfig.JWT.expirationInSec,
    });

    return token;
  }

  decodeJWT(token: string): IUserJWTPayload {
    try {
      const decoded = jwt.decode(token) as IUserJWTPayload;
      this.validateJWTPayload(decoded);

      return decoded;
    } catch (error) {
      console.error('Failed to decode JWT:', error);
      throw error;
    }
  }

  async validateJWT(args: {
    token: string | undefined;
  }): Promise<{ userJWTPayload: IUserJWTPayload; userDoc: IFirebaseResponse<IUser> }> {
    try {
      const { token } = args;
      if (!token) throw new AuthError();
      if (typeof token !== 'string') throw new AuthError();

      let filteredToken = token;

      if (filteredToken && filteredToken.includes('Bearer')) {
        filteredToken = filteredToken.split('Bearer ')[1];
      } else {
        throw new InvalidJWTError();
      }

      const blacklistedTokensRedisKey = getRedisKeyHelper('blacklistedTokens');
      const blacklistedTokens = await RedisInstance.lRange(blacklistedTokensRedisKey, { start: 0, end: -1 });

      const isTokenBlacklisted = blacklistedTokens?.find((blacklistedToken) => blacklistedToken === token);
      const { userDocId } = this.decodeJWT(filteredToken);
      if (isTokenBlacklisted) throw new BlacklistedTokenError(userDocId);

      const validated = jwt.verify(filteredToken, TokensConfig.JWT.secret);
      const inferredValidation = validated as IUserJWTPayload;

      this.validateJWTPayload(inferredValidation);

      const userDoc = await UserService.checkIfUserExistsByDocId(inferredValidation.userDocId);
      if (!userDoc.docData) {
        throw new AuthError();
      }

      return { userJWTPayload: inferredValidation, userDoc };
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') throw new JWTExpiredError();
      throw error;
    }
  }
}

export default new JWTService();
