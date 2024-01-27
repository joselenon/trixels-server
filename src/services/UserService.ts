import { ethers } from 'ethers';
import { FirebaseInstance } from '..';
import cutWalletAddress from '../common/cutWalletAddress';
import { UserNotFound } from '../config/errors/classes/ClientErrors';
import { UnexpectedDatabaseError } from '../config/errors/classes/SystemErrors';
import { IUser, IUserToFrontEnd } from '../config/interfaces/IUser';
import { IETHDepositWalletDb } from '../config/interfaces/IConfigs';
import ENVIRONMENT from '../config/constants/ENVIRONMENT';

export interface IUpdateUserCredentialsPayload {
  email?: string;
  roninWallet?: string;
}

class UserService {
  async register(username: string) {
    try {
      const nowTime = new Date().getTime();

      const userInDbObj: IUser = {
        username,
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

      const userId = await FirebaseInstance.writeDocument('users', userInDbObj);
      return userId;
    } catch (err: any) {
      throw new UnexpectedDatabaseError(err);
    }
  }

  async getUserCredentials(
    usernameLogged: string,
    usernameToQuery: string,
  ): Promise<IUserToFrontEnd> {
    /* !!!CHECANDO SE EXISTE SOMENTE O USUARIO QUE ESTÁ SENDO PESQUISADO!!! */
    const userInDb = await FirebaseInstance.getSingleDocumentByParam<IUser>(
      'users',
      'username',
      usernameToQuery,
    );
    if (!userInDb) throw new UserNotFound();

    const { createdAt, username, avatar, roninWallet, email, balance } = userInDb.result;
    const isSameUser = usernameLogged === usernameToQuery;

    return {
      username,
      avatar,
      roninWallet: {
        value: isSameUser ? roninWallet.value : cutWalletAddress(roninWallet.value),
      },
      email: isSameUser ? email : undefined,
      balance: isSameUser ? balance : undefined,
      createdAt,
    };
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

    const { email, roninWallet, avatar } = userInDb.result;

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
