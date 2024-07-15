import { FirebaseInstance, RedisInstance } from '..';
import cutWalletAddress from '../common/cutWalletAddress';
import {
  InvalidLoginMethodError,
  InvalidPasswordError,
  InvalidUsernameError,
  UserNotFound,
  UsernameAlreadyExistsError,
  WalletAlreadyInUseError,
  WalletAlreadyVerifiedError,
  WalletVerificationError,
} from '../config/errors/classes/ClientErrors';
import { GoogleOAuthSystemError, UnexpectedDatabaseError, UnknownError } from '../config/errors/classes/SystemErrors';
import { IUser, IUserToFrontEnd } from '../config/interfaces/IUser';
import encryptString from '../common/encryptString';
import validateEncryptedString from '../common/validateEncryptedString';
import getRedisKeyHelper from '../helpers/redisHelper';
import { IWalletVerificationInRedis } from '../config/interfaces/IWalletVerification';
import AxiosService from './AxiosService';
import { IFirebaseResponse } from '../config/interfaces/IFirebase';

export interface IUpdateUserCredentialsPayload {
  email?: string;
  roninWallet?: string;
}

interface IGoogleApisUserInfo {
  sub: string;
  name: string;
  picture: string;
  email: string;
}

class UserService {
  isUsernameValid(username: string) {
    const regex = /^[a-zA-Z0-9]{5,}$/;
    return regex.test(username);
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

    customFilteredUsername = customFilteredUsername.replace(' ', '');
    customFilteredUsername = customFilteredUsername.toLowerCase();
    customFilteredUsername = customFilteredUsername.replace(
      regex,
      (match) => replacements[match.toLowerCase()] || match,
    );

    return customFilteredUsername;
  }

  async checkIfUserExistsByDocId(userDocId: string): Promise<IFirebaseResponse<IUser>> {
    const userDoc = await FirebaseInstance.getDocumentRefWithData<IUser>('users', userDocId);
    return userDoc;
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

  async makeUsernameUnique(username: string) {
    const adjectives = [
      'Amazing',
      'Brilliant',
      'Crazy',
      'Daring',
      'Energetic',
      'Fantastic',
      'Glorious',
      'Heroic',
      'Incredible',
      'Joyful',
      'Kind',
      'Legendary',
      'Mighty',
      'Noble',
      'Outstanding',
      'Powerful',
      'Quick',
      'Radiant',
      'Strong',
      'Talented',
      'Unique',
      'Victorious',
      'Wonderful',
      'Xtraordinary',
      'Youthful',
      'Zealous',
    ];

    let uniqueUsername = '';
    let isUnique = false;

    while (!isUnique) {
      const randomIndex = Math.floor(Math.random() * adjectives.length);
      const randomAdjective = adjectives[randomIndex];
      uniqueUsername = `${randomAdjective}${username}`;

      const userExists = await this.checkIfUsernameExists(uniqueUsername);
      if (!userExists) {
        isUnique = true;
      }
    }

    return uniqueUsername;
  }

  async registerUser({
    username,
    password,
  }: {
    username: string;
    password: string;
  }): Promise<{ userCredentials: IUser; userCreatedId: string }> {
    if (!this.isUsernameValid(username)) throw new InvalidUsernameError();

    const userExists = await this.checkIfUsernameExists(username);
    if (userExists) throw new UsernameAlreadyExistsError();

    const nowTime = Date.now();

    const encryptedPassword = await encryptString(password);

    /* REVER QUESTÃO DO PASSWORD E RETORNO PARA O FRONT!!!!!! */
    const userInDbObj: IUser = {
      username,
      password: encryptedPassword,
      avatar: '',
      balance: 0,
      email: {
        value: '',
        verified: false,
        lastEmail: '',
        updatedAt: nowTime,
        googleSub: null,
      },
      roninWallet: {
        value: '',
        lastWallet: '',
        verified: false,
        updatedAt: nowTime,
      },
      createdAt: nowTime,
    };

    try {
      const { docId } = await FirebaseInstance.writeDocument('users', userInDbObj);
      return { userCredentials: userInDbObj, userCreatedId: docId };
    } catch (err: any) {
      throw new UnexpectedDatabaseError(err);
    }
  }

  /* Juntar formação de payload do usuário em uma lógica só!! (updateUserCredentials) */
  async registerUserThroughGoogle({
    googleName,
    avatar,
    emailValue,
    googleSub,
  }: {
    googleName: string;
    avatar: string;
    emailValue: string;
    googleSub: string;
  }): Promise<{ userCredentials: IUser; userCreatedId: string }> {
    try {
      let customFilteredUsername = this.filterCustomUsername(googleName);

      if (!this.isUsernameValid(customFilteredUsername)) {
        customFilteredUsername = this.filterCustomUsername(customFilteredUsername);
      }

      const userExists = await this.checkIfUsernameExists(customFilteredUsername);
      if (userExists) customFilteredUsername = await this.makeUsernameUnique(customFilteredUsername);

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
    const userExists = await this.checkIfUsernameExists(username);
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

  async loginUserThroughGoogle(accessToken: string): Promise<{
    userCredentials: IUserToFrontEnd;
    userDocId: string;
  }> {
    const googleAuthResponse = await AxiosService<IGoogleApisUserInfo>({
      url: `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`,
      method: 'get',
    });
    if (!googleAuthResponse.data) throw new GoogleOAuthSystemError();

    const { email: googleEmail, name: googleName, picture: googleAvatar, sub: googleSub } = googleAuthResponse.data;

    /* Using googleSub as parameter to query cause email is changeble, while googleSub never changes */
    const usersRelatedToEmail = await FirebaseInstance.getManyDocumentsByParam<IUser>(
      'users',
      'email.googleSub',
      googleSub,
    );

    /* If there's no user with the email yet, start an account creation */
    if (usersRelatedToEmail.documents.length <= 0) {
      const { userCredentials, userCreatedId } = await this.registerUserThroughGoogle({
        googleName,
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
      userCredentials: this.filterUserInfoToFrontEnd({
        userInfo: userDocData,
        userQueryingIsUserLogged: true,
      }),
      userDocId,
    };
  }

  async verifyEmail(userId: string, userEmail: string, accessToken: string) {
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
  }

  async getUserInDb(usernameLogged: string | undefined, usernameToQuery: string): Promise<IUserToFrontEnd> {
    const userInDb = await FirebaseInstance.getSingleDocumentByParam<IUser>('users', 'username', usernameToQuery);
    if (!userInDb) throw new UserNotFound();

    const isSameUser = usernameLogged === usernameToQuery;

    return this.filterUserInfoToFrontEnd({
      userInfo: userInDb.docData,
      userQueryingIsUserLogged: isSameUser,
    });
  }

  async getUserCredentials(userDocId: string): Promise<IUserToFrontEnd> {
    const userInDb = await FirebaseInstance.getDocumentById<IUser>('users', userDocId);
    if (!userInDb) throw new UserNotFound();

    return this.filterUserInfoToFrontEnd({
      userInfo: userInDb.docData,
      userQueryingIsUserLogged: true,
    });
  }

  /* Juntar formação de payload do usuário em uma lógica só!! (registerUserThroughGoogle) */
  async updateUserCredentials(
    userDoc: IFirebaseResponse<IUser>,
    payload: IUpdateUserCredentialsPayload,
  ): Promise<IUserToFrontEnd> {
    const { docId, docData } = userDoc;
    const { email, roninWallet } = docData;

    const usersWithSameWallet = await FirebaseInstance.getManyDocumentsByParam<IUser>(
      'users',
      'roninWallet.value',
      roninWallet,
    );

    usersWithSameWallet.documents.forEach((user) => {
      if (user.docData.roninWallet.verified) throw new WalletAlreadyInUseError();
    });

    const filteredPayload = {} as IUser;
    if (typeof payload.email === 'string') {
      filteredPayload.email = {
        lastEmail: email.value,
        updatedAt: Date.now(),
        value: payload.email,
        verified: false,
        googleSub: email.googleSub || null,
      };
    }

    if (typeof payload.roninWallet === 'string') {
      filteredPayload.roninWallet = {
        lastWallet: roninWallet.value,
        updatedAt: Date.now(),
        value: payload.roninWallet,
        verified: false,
      };
    }

    const updatedUser = await FirebaseInstance.updateDocument<IUser>('users', docId, filteredPayload);

    return this.filterUserInfoToFrontEnd({ userInfo: updatedUser.docData, userQueryingIsUserLogged: true });
  }

  /*   async createEthereumDepositWallet(userDocId: string) {
    const userRef = await FirebaseInstance.getDocumentRefWithData('users', userDocId);

    const randomWalletCreation = ethers.Wallet.createRandom();
    const encryptedWallet = await randomWalletCreation.encrypt(ENVIRONMENT.WALLETS_ENCRYPTION_KEY);

    const dbObj = {
      publicAddress: randomWalletCreation.address,
      encryptedJSON: encryptedWallet,
      walletEncryptionKeyVersion: ENVIRONMENT.WALLETS_ENCRYPTION_KEY_VERSION,
      userRef,
      createdAt: Date.now(),
    };
    await FirebaseInstance.writeDocument('ethereumDepositWallets', dbObj);

    return dbObj.publicAddress;
  }

  async getEthereumDepositWallet(userDocId: string) {
    const userRef = (await FirebaseInstance.getDocumentRefWithData('users', userDocId)).result;

    const walletInDb = await FirebaseInstance.getSingleDocumentByParam<IETHDepositWalletDb>(
      'ethereumDepositWallets',
      'userRef',
      userRef,
    );
    if (!walletInDb) {
      return await this.createEthereumDepositWallet(userDocId);
    }

    return walletInDb.result.publicAddress;
  } */

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

  async getUserCredentialsById(userId: string, userQueryingIsUserLogged: boolean) {
    const userInDb = await FirebaseInstance.getDocumentById<IUser>('users', userId);
    if (!userInDb) throw new UserNotFound();

    const userToFrontend = this.filterUserInfoToFrontEnd({ userInfo: userInDb.docData, userQueryingIsUserLogged });
    return userToFrontend;
  }
}

export default new UserService();
