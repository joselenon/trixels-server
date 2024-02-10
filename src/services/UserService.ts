import { ethers } from 'ethers';
import { FirebaseInstance } from '..';
import cutWalletAddress from '../common/cutWalletAddress';
import {
  InvalidPassword,
  InvalidUsername,
  UserNotFound,
  UsernameAlreadyExistsError,
} from '../config/errors/classes/ClientErrors';
import { UnexpectedDatabaseError } from '../config/errors/classes/SystemErrors';
import { IUser, IUserToFrontEnd } from '../config/interfaces/IUser';
import { IETHDepositWalletDb } from '../config/interfaces/IConfigs';
import ENVIRONMENT from '../config/constants/ENVIRONMENT';
import encryptString from '../common/encryptString';
import validateEncryptedString from '../common/validateEncryptedString';
import { checkIfUsernameExists } from '../common/checkIfUserAlreadyExists';

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

      const nowTime = new Date().getTime();

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
          updatedAt: nowTime,
        },
        createdAt: nowTime,
      };

      const userCreatedId = await FirebaseInstance.writeDocument('users', userInDbObj);
      return { userCredentials: userInDbObj, userCreatedId };
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
      if (!roninWallet.value) return undefined;

      if (isSameUser) {
        return roninWallet.value;
      } else {
        return cutWalletAddress(roninWallet.value);
      }
    };

    return {
      username,
      avatar,
      roninWallet: { value: filteredWallet() },
      email: isSameUser ? email : undefined,
      balance: isSameUser ? balance : undefined,
      createdAt,
    };
  }

  async loginUser({
    username,
    password,
  }: {
    username: string;
    password: string;
  }): Promise<{
    userCredentials: IUserToFrontEnd;
    userId: string;
  }> {
    const userExists = await checkIfUsernameExists(username);
    if (!userExists) throw new InvalidUsername();

    const { data } = userExists;

    const isPasswordValid = await validateEncryptedString(password, data.result.password);
    if (!isPasswordValid) throw new InvalidPassword();

    return {
      userId: data.docId,
      userCredentials: this.filterUserInfoToFrontEnd({
        userInfo: data.result,
        userQueryingIsUserLogged: true,
      }),
    };
  }

  async getUserCredentials(
    usernameLogged: string | undefined,
    usernameToQuery: string,
  ): Promise<IUserToFrontEnd> {
    /* !!!CHECANDO SE EXISTE SOMENTE O USUARIO QUE ESTÁ SENDO PESQUISADO!!! */
    const userInDb = await FirebaseInstance.getSingleDocumentByParam<IUser>(
      'users',
      'username',
      usernameToQuery,
    );
    if (!userInDb) throw new UserNotFound();

    const isSameUser = usernameLogged === usernameToQuery;

    return this.filterUserInfoToFrontEnd({
      userInfo: userInDb.result,
      userQueryingIsUserLogged: isSameUser,
    });
  }

  async updateUserCredentials(
    usernameLogged: string,
    payload: IUpdateUserCredentialsPayload,
  ) {
    const userInDb = await FirebaseInstance.getSingleDocumentByParam<IUser>(
      'users',
      'username',
      usernameLogged,
    );
    if (!userInDb) throw new UserNotFound();

    const { email, roninWallet } = userInDb.result;

    const filteredPayload = {} as IUser;
    if (payload.email) {
      filteredPayload.email = {
        lastEmail: email.value,
        updatedAt: new Date().getTime(),
        value: payload.email,
        verified: false,
      };
    }

    if (payload.roninWallet) {
      filteredPayload.roninWallet = {
        lastWallet: roninWallet.value,
        updatedAt: new Date().getTime(),
        value: payload.roninWallet,
      };
    }

    return await FirebaseInstance.updateDocument(
      'users',
      userInDb.docId,
      filteredPayload,
    );
  }

  async createEthereumDepositWallet(userDocId: string) {
    const userRef = await FirebaseInstance.getDocumentRef('users', userDocId);

    const randomWalletCreation = ethers.Wallet.createRandom();
    const encryptedWallet = await randomWalletCreation.encrypt(
      ENVIRONMENT.WALLETS_ENCRYPTION_KEY,
    );

    const dbObj = {
      publicAddress: randomWalletCreation.address,
      encryptedJSON: encryptedWallet,
      walletEncryptionKeyVersion: ENVIRONMENT.WALLETS_ENCRYPTION_KEY_VERSION,
      userRef,
      createdAt: new Date().getTime(),
    };
    await FirebaseInstance.writeDocument('ethereumDepositWallets', dbObj);

    return dbObj.publicAddress;
  }

  async getEthereumDepositWallet(userDocId: string) {
    const userRef = (await FirebaseInstance.getDocumentRef('users', userDocId)).result;

    const walletInDb =
      await FirebaseInstance.getSingleDocumentByParam<IETHDepositWalletDb>(
        'ethereumDepositWallets',
        'userRef',
        userRef,
      );
    if (!walletInDb) {
      return await this.createEthereumDepositWallet(userDocId);
    }

    return walletInDb.result.publicAddress;
  }
}

export default new UserService();
