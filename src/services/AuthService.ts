import { v4 } from 'uuid';
import getRedisKeyHelper from '../helpers/redisHelper';
import { IRefreshTokenRedisPayload } from '../config/interfaces/IRedis';
import { FirebaseInstance, RedisInstance } from '..';
import TokensConfig from '../config/app/TokensConfig';
import JWTService from './JWTService';
import { AuthError, JWTExpiredError } from '../config/errors/classes/ClientErrors';
import UserService from './UserService';
import {
  BlacklistedTokenError,
  GoogleOAuthSystemError,
  SuspiciousAuthError,
  UnexpectedDatabaseError,
  UnknownError,
} from '../config/errors/classes/SystemErrors';
import { IUser, IUserToFrontEnd } from '../config/interfaces/IUser';
import AxiosService from './AxiosService';

interface IGoogleApisUserInfo {
  sub: string;
  name: string;
  picture: string;
  email: string;
}

class AuthService {
  async genAccessToken(refreshToken: string, userId: string) {
    const refreshTokenRedisKey = getRedisKeyHelper('refreshToken', refreshToken);

    const userCredentials = await UserService.getUserCredentialsById(userId, true);
    const { username, avatar } = userCredentials;

    const genJWT = JWTService.signJWT({ username, avatar, userDocId: userId });
    const bearerToken = `Bearer ${genJWT}`;

    const refreshTokenRedisPayload: IRefreshTokenRedisPayload = {
      userId,
      lastAccessToken: bearerToken,
      received: false,
    };
    await RedisInstance.set(
      refreshTokenRedisKey,
      refreshTokenRedisPayload,
      { isJSON: true },
      TokensConfig.REFRESH_TOKEN.expirationInSec,
    );

    return { accessToken: bearerToken };
  }

  async setTokenToBlacklist(token: string) {
    const blacklistedTokensRedisKey = getRedisKeyHelper('blacklistedTokens');
    /* REVIEW (COLOCAR SISTEMA PARA EXPIRAR TOKENS INVÁLIDOS) */
    await RedisInstance.rPush(blacklistedTokensRedisKey, token, undefined);
  }

  async validateAccessToken(refreshToken: string, accessToken: string) {
    const refreshTokenRedisKey = getRedisKeyHelper('refreshToken', refreshToken);
    const refreshTokenRedis = await RedisInstance.get<IRefreshTokenRedisPayload>(refreshTokenRedisKey, {
      isJSON: true,
    });
    if (!refreshTokenRedis) throw new AuthError();

    const { lastAccessToken } = refreshTokenRedis;
    if (lastAccessToken === accessToken) {
      const refreshTokenRedisPayload: IRefreshTokenRedisPayload = {
        ...refreshTokenRedis,
        received: true,
      };
      await RedisInstance.set(refreshTokenRedisKey, refreshTokenRedisPayload, { isJSON: true });
    } else {
      throw new AuthError();
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    const refreshTokenRedisKey = getRedisKeyHelper('refreshToken', refreshToken);
    const refreshTokenRedis = await RedisInstance.get<IRefreshTokenRedisPayload>(refreshTokenRedisKey, {
      isJSON: true,
    });
    if (!refreshTokenRedis) throw new AuthError();

    const { userId, lastAccessToken, received } = refreshTokenRedis;

    try {
      if (received) {
        await JWTService.validateJWT({ token: lastAccessToken });
        throw new SuspiciousAuthError(userId);
      } else {
        await this.setTokenToBlacklist(lastAccessToken);
        return await this.genAccessToken(refreshToken, userId);
      }
    } catch (err: unknown) {
      if (err instanceof JWTExpiredError || err instanceof BlacklistedTokenError) {
        return await this.genAccessToken(refreshToken, userId);
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
    const refreshTokenRedisPayload: IRefreshTokenRedisPayload = {
      userId,
      lastAccessToken: bearerToken,
      received: false,
    };

    /* Little detail: the time i set this key-value with the expiration time, the time doesn't match with the cookie expiration time... */
    await RedisInstance.set(
      refreshTokenRedisKey,
      refreshTokenRedisPayload,
      { isJSON: true },
      TokensConfig.REFRESH_TOKEN.expirationInSec,
    );

    return { refreshToken, accessToken: bearerToken };
  }

  /* Juntar formação de payload do usuário em uma lógica só!! (updateUserCredentials) */
  async registerUserThroughGoogle({
    googlePersonalName,
    avatar,
    emailValue,
    googleSub,
  }: {
    googlePersonalName: string;
    avatar: string;
    emailValue: string;
    googleSub: string;
  }): Promise<{ userCredentials: IUser; userCreatedId: string }> {
    try {
      const usernameThroughEmailValue = emailValue.split('@')[0];
      let customFilteredUsername = UserService.filterCustomUsername(usernameThroughEmailValue);

      if (!UserService.isUsernameValid(customFilteredUsername)) {
        customFilteredUsername = UserService.filterCustomUsername(customFilteredUsername);
      }

      const userExists = await UserService.checkIfUsernameExists(customFilteredUsername);
      if (userExists) customFilteredUsername = await UserService.makeUsernameUnique(customFilteredUsername);

      const nowTime = Date.now();

      const userInDbObj: IUser = {
        username: customFilteredUsername,
        password: null,
        avatar,
        balance: 0,
        email: {
          value: emailValue,
          verified: true,
          lastEmail: '',
          updatedAt: nowTime,
          googleSub,
          googlePersonalName,
        },
        roninWallet: {
          value: '',
          lastWallet: '',
          verified: false,
          updatedAt: nowTime,
        },
        createdAt: nowTime,
      };

      const { docId } = await FirebaseInstance.writeDocument('users', userInDbObj);
      return { userCredentials: userInDbObj, userCreatedId: docId };
    } catch (err: any) {
      throw new UnexpectedDatabaseError(err);
    }
  }

  async loginUserThroughGoogle(accessToken: string): Promise<{
    userCredentials: IUserToFrontEnd;
    userDocId: string;
  }> {
    const googleAuthResponse = await AxiosService<IGoogleApisUserInfo>({
      url: `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`,
      method: 'get',
    });
    if (!googleAuthResponse.data) throw new GoogleOAuthSystemError();

    const {
      email: googleEmail,
      name: googlePersonalName,
      picture: googleAvatar,
      sub: googleSub,
    } = googleAuthResponse.data;

    /* Using googleSub as parameter to query cause email is changeble, while googleSub never changes */
    const usersRelatedToEmail = await FirebaseInstance.getManyDocumentsByParam<IUser>(
      'users',
      'email.googleSub',
      googleSub,
    );

    /* If there's no user with the email yet, start an account creation */
    if (usersRelatedToEmail.documents.length <= 0) {
      const { userCredentials, userCreatedId } = await this.registerUserThroughGoogle({
        googlePersonalName,
        emailValue: googleEmail,
        avatar: googleAvatar,
        googleSub,
      });

      return { userCredentials, userDocId: userCreatedId };
    }

    if (usersRelatedToEmail.documents.length > 1) throw new UnknownError('More than 1 user with same verified email.');
    const userRelatedToVerifiedEmail = usersRelatedToEmail.documents[0];

    const userDocId = userRelatedToVerifiedEmail.docId;
    const userDocData = userRelatedToVerifiedEmail.docData;

    return {
      userCredentials: UserService.filterUserInfoToFrontEnd({
        userInfo: userDocData,
        userQueryingIsUserLogged: true,
      }),
      userDocId,
    };
  }
}

export default new AuthService();
