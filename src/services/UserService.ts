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
import { GoogleOAuthSystemError, UnexpectedDatabaseError } from '../config/errors/classes/SystemErrors';
import { IUser, IUserToFrontEnd } from '../config/interfaces/IUser';
import encryptString from '../common/encryptString';
import validateEncryptedString from '../common/validateEncryptedString';
import { checkIfUsernameExists } from '../common/checkIfUserAlreadyExists';
import getRedisKeyHelper from '../helpers/redisHelper';
import { WALLET_VERIFICATION_EXPIRATION_IN_SECONDS } from '../config/app/System';
import { IWalletVerificationInRedis } from '../config/interfaces/IWalletVerification';
import AxiosService from './AxiosService';

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
  async registerUser({
    username,
    password,
  }: {
    username: string;
    password: string;
  }): Promise<{ userCredentials: IUser; userCreatedId: string }> {
    try {
      const userExists = await checkIfUsernameExists(username);
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
      const customName = googleName.replace(' ', '');

      const userExists = await checkIfUsernameExists(customName);
      if (userExists) throw new UsernameAlreadyExistsError();

      const nowTime = Date.now();

      /* REVIEW QUESTÃO DO PASSWORD E RETORNO PARA O FRONT!!!!!! */
      const userInDbObj: IUser = {
        username: customName,
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

    const filteredWallet = () => {
      if (!roninWallet.value) return { value: undefined };

      if (isSameUser) {
        return { value: roninWallet.value, verified: roninWallet.verified };
      } else {
        return { value: cutWalletAddress(roninWallet.value) };
      }
    };

    return {
      username,
      avatar,
      roninWallet: filteredWallet(),
      email: isSameUser ? email : undefined,
      balance: isSameUser ? balance : undefined,
      createdAt,
    };
  }

  async loginUser({ username, password }: { username: string; password: string }): Promise<{
    userId: string;
    userCredentials: IUserToFrontEnd;
  }> {
    const userExists = await checkIfUsernameExists(username);
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

    const usersRelatedToEmail = await FirebaseInstance.getManyDocumentsByParam<IUser>(
      'users',
      'email.value',
      googleEmail,
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

    const userRelatedToVerifiedEmail = usersRelatedToEmail.documents.find((user) => user.docData.email.verified);
    if (!userRelatedToVerifiedEmail) throw new Error('user didnt verified email');

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

  async updateUserCredentials(usernameLogged: string, payload: IUpdateUserCredentialsPayload) {
    const userInDb = await FirebaseInstance.getSingleDocumentByParam<IUser>('users', 'username', usernameLogged);
    if (!userInDb) throw new UserNotFound();

    const { email, roninWallet } = userInDb.docData;

    const usersWithSameWallet = await FirebaseInstance.getManyDocumentsByParam<IUser>(
      'users',
      'roninWallet.value',
      roninWallet,
    );

    usersWithSameWallet.documents.forEach((user) => {
      if (user.docData.roninWallet.verified) throw new WalletAlreadyInUseError();
    });

    const filteredPayload = {} as IUser;
    if (payload.email) {
      filteredPayload.email = {
        lastEmail: email.value,
        updatedAt: Date.now(),
        value: payload.email,
        verified: false,
      };
    }

    if (payload.roninWallet) {
      filteredPayload.roninWallet = {
        lastWallet: roninWallet.value,
        updatedAt: Date.now(),
        value: payload.roninWallet,
        verified: false,
      };
    }

    return await FirebaseInstance.updateDocument('users', userInDb.docId, filteredPayload);
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

  async verifyWallet(userId: string): Promise<IWalletVerificationInRedis> {
    const { docData } = await FirebaseInstance.getDocumentRefWithData<IUser>('users', userId);

    const { roninWallet } = docData;
    if (!roninWallet.value) throw new WalletVerificationError();
    if (roninWallet.verified) throw new WalletAlreadyVerifiedError();

    const redisKey = getRedisKeyHelper('walletVerification', roninWallet.value);
    const walletVerificationInRedis =
      (await RedisInstance.lRange<IWalletVerificationInRedis>(redisKey, { start: 0, end: -1 }, { isJSON: true })) || [];

    const isUserAlreadyVerifyingAddress = walletVerificationInRedis.find((item) => item.userId === userId);
    if (isUserAlreadyVerifyingAddress) {
      return isUserAlreadyVerifyingAddress;
    }

    const nowDate = Date.now();
    function getRandomNumber() {
      const randomNum = Math.random();
      return Number(randomNum.toFixed(8));
    }

    const randomValueToSend = { randomValue: getRandomNumber() };
    const walletVerificationRedisPayload: IWalletVerificationInRedis = {
      createdAt: nowDate,
      userId,
      roninWallet: roninWallet.value,
      ...randomValueToSend,
    };

    await RedisInstance.rPush(
      redisKey,
      walletVerificationRedisPayload,
      { isJSON: true },
      WALLET_VERIFICATION_EXPIRATION_IN_SECONDS,
    );

    return walletVerificationRedisPayload;
  }

  async getUserCredentialsById(userId: string, userQueryingIsUserLogged: boolean) {
    const userInDb = await FirebaseInstance.getDocumentById<IUser>('users', userId);
    if (!userInDb) throw new UserNotFound();

    const userToFrontend = this.filterUserInfoToFrontEnd({ userInfo: userInDb.docData, userQueryingIsUserLogged });
    return userToFrontend;
  }
}

export default new UserService();
