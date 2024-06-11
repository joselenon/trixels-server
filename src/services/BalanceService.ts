import getRedisKeyHelper from '../helpers/redisHelper';
import { FirebaseInstance, RedisInstance } from '..';
import { IUser } from '../config/interfaces/IUser';
import { IBetInDB } from '../config/interfaces/IBet';
import { UnknownError } from '../config/errors/classes/SystemErrors';
import { InvalidUsername } from '../config/errors/classes/ClientErrors';
import PubSubEventManager from './PubSubEventManager';
import { ITransactionInDb } from '../config/interfaces/ITransaction';

class BalanceService {
  static async calculateTransactions(userRef: FirebaseFirestore.DocumentReference) {
    const userTransactions = await FirebaseInstance.getManyDocumentsByParam<ITransactionInDb>(
      'transactions',
      'userRef',
      userRef,
    );
    if (!userTransactions) return 0;

    const calc = userTransactions.reduce((acc, transaction) => {
      switch (transaction.result.type) {
        case 'deposit':
          acc += transaction.result.value;
          break;
        case 'withdraw':
          acc -= transaction.result.value;
          break;
      }
      return acc;
    }, 0);

    return calc;

    // Potential Errors: UnexpectedDatabaseError
  }

  static async calculateBets(userRef: FirebaseFirestore.DocumentReference) {
    const userBets = await FirebaseInstance.getManyDocumentsByParam<IBetInDB>('bets', 'userRef', userRef);
    if (!userBets || userBets.length <= 0) return 0;

    const calc = userBets.reduce((acc, bet) => {
      if (typeof bet.result.amountBet !== 'number' || typeof bet.result.prize !== 'number') {
        throw new UnknownError('Invalid bet infos');
      }

      const difference = bet.result.prize - bet.result.amountBet;
      return acc + difference;
    }, 0);

    return calc;

    // Potential Errors: UnexpectedDatabaseError
  }

  // Recalculate all the transactions and bets in order to update the balance (DB, Cache, Client???)
  static async hardUpdateBalances(userDocId: string) {
    const userRef = (await FirebaseInstance.getDocumentRefWithData<IUser>('users', userDocId)).result;

    const balanceCalc = async () => {
      const calculateTransactions = await BalanceService.calculateTransactions(userRef);
      const calculateBets = await BalanceService.calculateBets(userRef);

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

  static async getUserBalance(userDocId: string): Promise<{ balance: number }> {
    const userInDb = await FirebaseInstance.getDocumentById<IUser>('users', userDocId);
    if (!userInDb) throw new InvalidUsername();

    return { balance: userInDb.result.balance };
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
        const nowTime = new Date().getTime();
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
