import { FirebaseInstance, RedisInstance } from '..';
import cutWalletAddress from '../common/cutWalletAddress';
import {
  InvalidLoginMethodError,
  InvalidPasswordError,
  InvalidUsernameError,
  UserNotFound,
  WalletAlreadyVerifiedError,
  WalletVerificationError,
} from '../config/errors/classes/ClientErrors';
import { IUser, IUserToFrontEnd } from '../config/interfaces/IUser';
import validateEncryptedString from '../common/validateEncryptedString';
import getRedisKeyHelper from '../helpers/redisHelper';
import { IWalletVerificationInRedis } from '../config/interfaces/IWalletVerification';
import { IFirebaseResponse } from '../config/interfaces/IFirebase';

class UserService {
  isUsernameValid(username: string) {
    const regex = /^[a-zA-Z0-9]{5,}$/;
    return regex.test(username);
  }

  async checkIfUserExistsByDocId(userDocId: string): Promise<IFirebaseResponse<IUser>> {
    const userDoc = await FirebaseInstance.getDocumentRefWithData<IUser>('users', userDocId);
    return userDoc;
  }

  filterCustomUsername(username: string) {
    let customFilteredUsername = username;
    /* Replace special characters and makes it lowercase */
    const replacements: { [key: string]: string } = {
      á: 'a',
      à: 'a',
      â: 'a',
      ã: 'a',
      ä: 'a',
      å: 'a',
      é: 'e',
      è: 'e',
      ê: 'e',
      ë: 'e',
      í: 'i',
      ì: 'i',
      î: 'i',
      ï: 'i',
      ó: 'o',
      ò: 'o',
      ô: 'o',
      õ: 'o',
      ö: 'o',
      ú: 'u',
      ù: 'u',
      û: 'u',
      ü: 'u',
      ç: 'c',
      ñ: 'n',
      ß: 'ss',
    };
    const regex = /[áàâãäåéèêëíìîïóòôõöúùûüçñß]/gi;

    customFilteredUsername = customFilteredUsername
      .replace(' ', '')
      .toLowerCase()
      .replace(regex, (match) => replacements[match.toLowerCase()] || match);

    return customFilteredUsername;
  }

  async checkIfUsernameExists(
    username: string,
  ): Promise<{ userExists: boolean; data: IFirebaseResponse<IUser> } | false> {
    const userExists = await FirebaseInstance.getSingleDocumentByParam<IUser>('users', 'username', username);

    if (userExists) {
      return { userExists: !!userExists.docData, data: userExists };
    }

    return false;
  }

  filterUserInfoToFrontEnd({
    userInfo,
    userQueryingIsUserLogged,
  }: {
    userInfo: IUser;
    userQueryingIsUserLogged: boolean;
  }): IUserToFrontEnd {
    const { createdAt, username, avatar, roninWallet, email, balance } = userInfo;
    const isSameUser = userQueryingIsUserLogged;

    let roninWalletFiltered: IUserToFrontEnd['roninWallet'] = { ...roninWallet };

    if (isSameUser) {
      roninWalletFiltered = { ...roninWalletFiltered, value: roninWallet.value || '' };
    } else {
      roninWalletFiltered = {
        ...roninWalletFiltered,
        value: roninWallet.value ? cutWalletAddress(roninWallet.value) : '',
      };
    }

    return {
      username,
      avatar,
      roninWallet: roninWalletFiltered,
      email: isSameUser ? email : undefined,
      balance: isSameUser ? balance : undefined,
      createdAt,
    };
  }

  async loginUser({ username, password }: { username: string; password: string }): Promise<{
    userId: string;
    userCredentials: IUserToFrontEnd;
  }> {
    const customFilteredUsername = this.filterCustomUsername(username);

    const userExists = await this.checkIfUsernameExists(customFilteredUsername);
    if (!userExists) throw new InvalidUsernameError();

    const { data: userData } = userExists;
    const userEncryptedPassword = userData.docData.password;

    if (!userEncryptedPassword) throw new InvalidLoginMethodError();

    const isPasswordValid = await validateEncryptedString(password, userEncryptedPassword);
    if (!isPasswordValid) throw new InvalidPasswordError();

    return {
      userId: userData.docId,
      userCredentials: this.filterUserInfoToFrontEnd({
        userInfo: userData.docData,
        userQueryingIsUserLogged: true,
      }),
    };
  }

  /*   async verifyEmail(userId: string, userEmail: string, accessToken: string) {
    const nowTime = Date.now();

    const googleAuthResponse = await AxiosService<IGoogleApisUserInfo>({
      url: `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`,
      method: 'get',
    });
    if (!googleAuthResponse.data) throw new GoogleOAuthSystemError();

    const { sub: googleSub, email: googleEmail } = googleAuthResponse.data;

    if (userEmail !== googleEmail) throw new Error('Emails não batem');

    await FirebaseInstance.updateDocument('users', userId, {
      'email.verified': true,
      'email.googleSub': googleSub,
      'email.verifiedAt': nowTime,
    });

    return true;
  } */

  async getUserInDb(usernameLogged: string | undefined, usernameToQuery: string): Promise<IUserToFrontEnd> {
    const userInDb = await FirebaseInstance.getSingleDocumentByParam<IUser>('users', 'username', usernameToQuery);
    if (!userInDb) throw new UserNotFound();

    const isSameUser = usernameLogged === usernameToQuery;

    return this.filterUserInfoToFrontEnd({
      userInfo: userInDb.docData,
      userQueryingIsUserLogged: isSameUser,
    });
  }

  async startWalletVerification(nowTime: number, userId: string, roninWallet: string, request: string) {
    const walletVerificationRedisKey = getRedisKeyHelper('walletVerification');
    const allWalletVerifications =
      (await RedisInstance.get<IWalletVerificationInRedis[]>(walletVerificationRedisKey, {
        isJSON: true,
      })) || [];

    const nowDate = Date.now();
    function getRandomNumber() {
      const randomNum = Math.random();
      return Number(randomNum.toFixed(8));
    }

    const randomValueToSend = { randomValue: getRandomNumber() };

    const walletVerificationRedisPayload: IWalletVerificationInRedis = {
      createdAt: nowDate,
      userId,
      roninWallet,
      request: request,
      ...randomValueToSend,
    };

    const updatedWalletVerification = [...allWalletVerifications, walletVerificationRedisPayload];

    await RedisInstance.set(walletVerificationRedisKey, updatedWalletVerification, { isJSON: true });

    return walletVerificationRedisPayload;
  }

  async verifyWallet(userId: string, request: string): Promise<IWalletVerificationInRedis> {
    const nowTime = Date.now();
    const { docData } = await FirebaseInstance.getDocumentRefWithData<IUser>('users', userId);

    const { roninWallet } = docData;
    if (!roninWallet.value) throw new WalletVerificationError();
    if (roninWallet.verified) throw new WalletAlreadyVerifiedError();

    const walletVerificationRedisKey = getRedisKeyHelper('walletVerification');
    const walletVerificationInRedis =
      (await RedisInstance.get<IWalletVerificationInRedis[]>(walletVerificationRedisKey, {
        isJSON: true,
      })) || [];

    const findWalletVerification = walletVerificationInRedis.find((wv) => wv.userId === userId);
    if (findWalletVerification && findWalletVerification.roninWallet === roninWallet.value) {
      return findWalletVerification;
    }

    return await this.startWalletVerification(nowTime, userId, roninWallet.value, request);
  }
}

export default new UserService();
