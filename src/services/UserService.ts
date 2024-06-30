import { FirebaseInstance, RedisInstance } from '..';
import cutWalletAddress from '../common/cutWalletAddress';
import {
  InvalidPassword,
  InvalidUsername,
  UserNotFound,
  UsernameAlreadyExistsError,
  WalletAlreadyVerifiedError,
  WalletVerificationError,
} from '../config/errors/classes/ClientErrors';
import { UnexpectedDatabaseError } from '../config/errors/classes/SystemErrors';
import { IUser, IUserToFrontEnd } from '../config/interfaces/IUser';
import encryptString from '../common/encryptString';
import validateEncryptedString from '../common/validateEncryptedString';
import { checkIfUsernameExists } from '../common/checkIfUserAlreadyExists';
import getRedisKeyHelper from '../helpers/redisHelper';
import { WALLET_VERIFICATION_EXPIRATION_IN_SECONDS } from '../config/app/System';
import { IWalletVerificationInRedis } from '../config/interfaces/IWalletVerification';

export interface IUpdateUserCredentialsPayload {
  email?: string;
  roninWallet?: string;
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
    userCredentials: IUserToFrontEnd;
    userId: string;
  }> {
    const userExists = await checkIfUsernameExists(username);
    if (!userExists) throw new InvalidUsername();

    const { data } = userExists;

    const isPasswordValid = await validateEncryptedString(password, data.docData.password);
    if (!isPasswordValid) throw new InvalidPassword();

    return {
      userId: data.docId,
      userCredentials: this.filterUserInfoToFrontEnd({
        userInfo: data.docData,
        userQueryingIsUserLogged: true,
      }),
    };
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

  async updateUserCredentials(usernameLogged: string, payload: IUpdateUserCredentialsPayload) {
    const userInDb = await FirebaseInstance.getSingleDocumentByParam<IUser>('users', 'username', usernameLogged);
    if (!userInDb) throw new UserNotFound();

    const { email, roninWallet } = userInDb.docData;

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

    const redisKey = getRedisKeyHelper('walletVerification', userId);
    const walletVerificationInRedis = await RedisInstance.get<IWalletVerificationInRedis>(redisKey, { isJSON: true });

    if (walletVerificationInRedis) {
      return walletVerificationInRedis;
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

    await RedisInstance.set(
      redisKey,
      walletVerificationRedisPayload,
      { isJSON: true },
      WALLET_VERIFICATION_EXPIRATION_IN_SECONDS,
    );

    return walletVerificationRedisPayload;
  }
}

export default new UserService();
