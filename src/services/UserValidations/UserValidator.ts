import * as admin from 'firebase-admin';

import { FirebaseInstance } from '../..';
import { UnknownError } from '../../config/errors/classes/SystemErrors';
import { IUser } from '../../config/interfaces/IUser';

/* MADE BY GPT */
/* Fazer tratativas para multi-accounting/abusers */

type UsersReferences = admin.firestore.DocumentReference<admin.firestore.DocumentData>[];

class UserValidator {
  async processMultiAccounting(userInfo: { userId: string; email?: string; ronin_wallet?: string }) {
    const { userId, ronin_wallet, email } = userInfo;

    const userRef = (await FirebaseInstance.getDocumentRefWithData('users', userId)).result;

    const usersEncountered: { email: UsersReferences; ronin_wallet: UsersReferences } = {
      email: [],
      ronin_wallet: [],
    };

    if (email) {
      const usersEncounteredByEmail = await FirebaseInstance.getManyDocumentsByParam<IUser>('users', 'email', email);

      if (usersEncounteredByEmail) {
        for (const user of usersEncounteredByEmail) {
          const pushUser = async () => {
            const getRef = await FirebaseInstance.getDocumentRefWithData<IUser>('users', user.docId);

            usersEncountered.email.push(getRef.result);
          };

          pushUser();
        }
      }
    }

    if (ronin_wallet) {
      const usersEncounteredByRoninWallet = await FirebaseInstance.getManyDocumentsByParam<IUser>(
        'users',
        'ronin_wallet',
        ronin_wallet,
      );

      if (usersEncounteredByRoninWallet) {
        for (const user of usersEncounteredByRoninWallet) {
          const pushUser = async () => {
            const getRef = await FirebaseInstance.getDocumentRefWithData<IUser>('users', user.docId);

            usersEncountered.ronin_wallet.push(getRef.result);
          };

          pushUser();
        }
      }
    }

    if (usersEncountered.email.length > 0 || usersEncountered.ronin_wallet.length > 0) {
      const allAccountsRefs: UsersReferences = [];

      usersEncountered.email.forEach((ref) => allAccountsRefs.push(ref));
      usersEncountered.ronin_wallet.forEach((ref) => allAccountsRefs.push(ref));

      await this.writeMultiAccountsRegistry(userRef, allAccountsRefs);
    }
  }

  async isUsernameAvailable(username: string) {
    const userInDb = await FirebaseInstance.getSingleDocumentByParam('users', 'username', username);

    if (userInDb?.result) {
      return false;
    } else {
      return true;
    }
  }

  async writeMultiAccountsRegistry(
    userRef: admin.firestore.DocumentReference<admin.firestore.DocumentData>,
    userRefsArray: UsersReferences,
  ) {
    try {
      const registry = await FirebaseInstance.writeDocument('multies', {
        userRef,
        userRefsArray,
      });

      return registry;
    } catch (err: any) {
      throw new UnknownError(err);
    }
  }
}

export default new UserValidator();
