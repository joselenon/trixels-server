import { FirebaseInstance, RabbitMQInstance } from '../..';
import { UserNotFound, WalletAlreadyInUseError } from '../../config/errors/classes/ClientErrors';
import { IUser, IUserToFrontEnd } from '../../config/interfaces/IUser';
import { IFirebaseResponse } from '../../config/interfaces/IFirebase';
import UserService from '../UserService';
import { UnknownError } from '../../config/errors/classes/SystemErrors';

export interface IUpdateUserCredentialsPayload {
  email?: string;
  roninWalletValue?: string;
}

interface IUpdateUserCredentialsInfo {
  userDoc: IFirebaseResponse<IUser>;
  payload: IUpdateUserCredentialsPayload;
}

class UserCredentialsService {
  async getUserCredentials(userDocId: string): Promise<IUserToFrontEnd> {
    const userInDb = await FirebaseInstance.getDocumentById<IUser>('users', userDocId);
    if (!userInDb) throw new UserNotFound();

    return UserService.filterUserInfoToFrontEnd({
      userInfo: userInDb.docData,
      userQueryingIsUserLogged: true,
    });
  }

  async getUserCredentialsById(userId: string, userQueryingIsUserLogged: boolean) {
    const userInDb = await FirebaseInstance.getDocumentById<IUser>('users', userId);
    if (!userInDb) throw new UserNotFound();

    const userToFrontend = UserService.filterUserInfoToFrontEnd({
      userInfo: userInDb.docData,
      userQueryingIsUserLogged,
    });
    return userToFrontend;
  }

  /* Juntar formação de payload do usuário em uma lógica só!! (registerUserThroughGoogle) */
  async updateUserCredentials(info: IUpdateUserCredentialsInfo): Promise<IUserToFrontEnd> {
    const { payload, userDoc } = info;
    const { roninWalletValue } = payload;
    const filteredPayload = { ...payload, roninWallet: roninWalletValue?.toLowerCase() || '' };

    const rpcResponse = await RabbitMQInstance.sendRPCMessage<IUserToFrontEnd>('updateUserCredentialsQueue', {
      userDoc,
      payload: filteredPayload,
    });
    RabbitMQInstance.checkForErrorsAfterRPC(rpcResponse);

    const { fnReturnedData } = rpcResponse;
    if (!fnReturnedData) throw new UnknownError('No fnReturnedData while updating user credentials');

    return fnReturnedData;
  }

  private async consumeUpdateUserCredentialsQueue(msg: string): Promise<IUserToFrontEnd> {
    const parsedMessage = JSON.parse(msg) as {
      userDoc: IFirebaseResponse<IUser>;
      payload: IUpdateUserCredentialsPayload;
    };

    const { payload, userDoc } = parsedMessage;
    const { roninWalletValue: roninWalletPayload } = payload;

    const { docId, docData } = userDoc;
    const { email, roninWallet } = docData;

    if (roninWalletPayload) {
      const usersWithSameWallet = await FirebaseInstance.getManyDocumentsByParam<IUser>(
        'users',
        'roninWallet.value',
        roninWalletPayload,
      );

      for (const user of usersWithSameWallet.documents) {
        if (user.docData.roninWallet.verified) {
          throw new WalletAlreadyInUseError();
        }
      }
    }

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

    if (typeof payload.roninWalletValue === 'string') {
      filteredPayload.roninWallet = {
        lastWallet: roninWallet.value,
        updatedAt: Date.now(),
        value: payload.roninWalletValue,
        verified: false,
      };
    }

    const updatedUser = await FirebaseInstance.updateDocument<IUser>('users', docId, filteredPayload);
    return UserService.filterUserInfoToFrontEnd({ userInfo: updatedUser.docData, userQueryingIsUserLogged: true });
  }

  async startUpdateUserCredentialsQueue() {
    await RabbitMQInstance.consumeMessages('updateUserCredentialsQueue', async (msg) => {
      return await this.consumeUpdateUserCredentialsQueue(msg);
    });
  }
}

export default new UserCredentialsService();
