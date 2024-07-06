import getRedisKeyHelper from '../helpers/redisHelper';
import { FirebaseInstance, RedisInstance } from '..';
import { IUser } from '../config/interfaces/IUser';
import { IBetInDB } from '../config/interfaces/IBet';
import { UnknownError } from '../config/errors/classes/SystemErrors';
import { InvalidUsernameError } from '../config/errors/classes/ClientErrors';
import PubSubEventManager from './PubSubEventManager';
import { TTransactionsInDb } from '../config/interfaces/ITransaction';

class BalanceService {
  static async calculateTransactions(userRef: FirebaseFirestore.DocumentReference) {
    const userTransactions = await FirebaseInstance.getManyDocumentsByParam<TTransactionsInDb>(
      'transactions',
      'userRef',
      userRef,
    );
    if (userTransactions.documents.length <= 0) return 0;

    const { documents } = userTransactions;
    const calc = documents.reduce((acc, transaction) => {
      const { value, type } = transaction.docData;

      switch (type) {
        case 'deposit':
          acc += value;
          break;

        case 'withdraw':
          acc -= value;
          break;
      }
      return acc;
    }, 0);

    return calc;

    // Potential Errors: UnexpectedDatabaseError
  }

  static async calculateBets(userRef: FirebaseFirestore.DocumentReference) {
    const userBets = await FirebaseInstance.getManyDocumentsByParam<IBetInDB>('bets', 'userRef', userRef);
    if (userBets.documents.length <= 0) return 0;

    const { documents } = userBets;

    const calc = documents.reduce((acc, bet) => {
      const { amountBet, prize } = bet.docData;

      if (typeof amountBet !== 'number' || typeof prize !== 'number') {
        throw new UnknownError('Invalid bet infos');
      }

      const difference = prize - amountBet;
      return acc + difference;
    }, 0);

    return calc;

    // Potential Errors: UnexpectedDatabaseError
  }

  // Recalculate all the transactions and bets in order to update the balance (DB, Cache, Client???)
  static async hardUpdateBalances(userDocId: string) {
    const { docRef } = await FirebaseInstance.getDocumentRefWithData<IUser>('users', userDocId);

    const balanceCalc = async () => {
      const calculateTransactions = await BalanceService.calculateTransactions(docRef);
      const calculateBets = await BalanceService.calculateBets(docRef);

      return calculateTransactions + calculateBets;
    };

    const calculatedBalance = await balanceCalc();
    const balanceObj = { balance: calculatedBalance };

    await FirebaseInstance.updateDocument('users', userDocId, balanceObj);

    const cacheKey = getRedisKeyHelper('last_balance_att', userDocId);
    await RedisInstance.set(cacheKey, balanceObj, { isJSON: true });

    return balanceObj;
    // Potential Errors: UnexpectedDatabaseError || RedisError
  }

  static async getUserBalance(userDocId: string): Promise<{
    balance: number;
    docData: IUser;
    docRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData, FirebaseFirestore.DocumentData>;
  }> {
    const userInDb = await FirebaseInstance.getDocumentRefWithData<IUser>('users', userDocId);
    if (!userInDb) throw new InvalidUsernameError();

    const { docData, docRef } = userInDb;

    return { balance: docData.balance, docData, docRef };
  }

  static sendBalancePubSubEvent(userDocId: string, balanceValue: number, sendInTimestamp?: number) {
    try {
      const updateBalance = async () => {
        await PubSubEventManager.publishEvent(
          'GET_LIVE_BALANCE',
          { success: true, type: 'GET_LIVE_BALANCE', message: 'GET_MSG', data: { balance: balanceValue } },
          userDocId,
        );
      };

      if (sendInTimestamp) {
        const nowTime = Date.now();
        const timeoutTime = sendInTimestamp - nowTime;

        setTimeout(updateBalance, timeoutTime > 0 ? timeoutTime : 0);
      } else {
        updateBalance();
      }

      return balanceValue;
    } catch (error) {
      console.error('Error in sendBalancePubSubEvent:', error);
      throw error;
    }
  }
}

export default BalanceService;
