import { FirebaseInstance } from '..';
import cutWalletAddress from '../common/cutWalletAddress';
import { UserNotFound } from '../config/errors/classes/ClientErrors';
import { UnexpectedDatabaseError } from '../config/errors/classes/SystemErrors';
import { IUser, IUserToFrontEnd } from '../config/interfaces/IUser';

class UserService {
  async register(username: string) {
    try {
      const nowTime = new Date().getTime();

      const userInDbObj = {
        username,
        balance: 0,
        email: {
          value: '',
          verified: false,
          lastEmail: '',
          updatedAt: nowTime,
        },
        ronin_wallet: {
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
    const userInDb = await FirebaseInstance.getSingleDocumentByParam<IUser>(
      'users',
      'username',
      usernameToQuery,
    );
    if (!userInDb) throw new UserNotFound();

    const { createdAt, username, avatar, ronin_wallet, email, balance } = userInDb.result;

    /* REFATORAR (TIRAR IFs, REPENSAR NESSA LOGICA DE QUERY DE USUARIOS (PERIGOSA)) */
    if (usernameToQuery === usernameLogged) {
      const filteredCredentialsToFrontEnd: IUserToFrontEnd = {
        username,
        avatar,
        ronin_wallet: { value: ronin_wallet.value },
        email,
        balance,
        createdAt,
      };
      return filteredCredentialsToFrontEnd;
    } else {
      const filteredCredentialsToFrontEnd: IUserToFrontEnd = {
        username,
        avatar,
        ronin_wallet: { value: cutWalletAddress(ronin_wallet.value) },
        createdAt,
      };
      return filteredCredentialsToFrontEnd;
    }
  }
}

export default new UserService();
