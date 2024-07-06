import { v4 } from 'uuid';
import getRedisKeyHelper from '../helpers/redisHelper';
import { IRefreshTokenRedisPayload } from '../config/interfaces/IRedis';
import { RedisInstance } from '..';
import TokensConfig from '../config/app/TokensConfig';
import JWTService from './JWTService';
import { AuthError, JWTExpiredError } from '../config/errors/classes/ClientErrors';
import UserService from './UserService';
import { SuspiciousAuthError } from '../config/errors/classes/SystemErrors';

class AuthService {
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    const refreshTokenRedisKey = getRedisKeyHelper('refreshToken', refreshToken);
    const refreshTokenRedis = await RedisInstance.get<IRefreshTokenRedisPayload>(refreshTokenRedisKey, {
      isJSON: true,
    });
    if (!refreshTokenRedis) throw new AuthError();

    const { userId, lastAccessToken } = refreshTokenRedis;

    try {
      JWTService.validateJWT({ token: lastAccessToken, mustBeAuth: true });
      throw new SuspiciousAuthError(userId);
    } catch (err: unknown) {
      if (err instanceof JWTExpiredError) {
        const userCredentials = await UserService.getUserCredentialsById(userId, true);
        const { username, avatar } = userCredentials;

        const genJWT = JWTService.signJWT({ username, avatar, userDocId: userId });
        const bearerToken = `Bearer ${genJWT}`;

        const refreshTokenRedisPayload: IRefreshTokenRedisPayload = { userId, lastAccessToken: bearerToken };
        await RedisInstance.set(
          refreshTokenRedisKey,
          refreshTokenRedisPayload,
          { isJSON: true },
          TokensConfig.REFRESH_TOKEN.expirationInSec,
        );

        return { accessToken: genJWT };
      }

      throw err;
    }
  }

  async genAuthTokens({ userId, username }: { userId: string; username: string }) {
    const accessToken = JWTService.signJWT({ userDocId: userId, username });
    const bearerToken = `Bearer ${accessToken}`;

    /* Colocar checagem para ver se refreshToken ja existe (usuário logando de novo) AVERIGUAR REVIEW */
    const refreshToken = v4();
    const refreshTokenRedisKey = getRedisKeyHelper('refreshToken', refreshToken);
    const refreshTokenRedisPayload: IRefreshTokenRedisPayload = { userId, lastAccessToken: bearerToken };

    /* Little detail: the time i set this key-value with the expiration time, the time doesn't match with the cookie expiration time... */
    await RedisInstance.set(
      refreshTokenRedisKey,
      refreshTokenRedisPayload,
      { isJSON: true },
      TokensConfig.REFRESH_TOKEN.expirationInSec,
    );

    return { refreshToken, accessToken };
  }
}

export default new AuthService();
