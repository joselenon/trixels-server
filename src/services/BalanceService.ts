import ITransaction from '../config/interfaces/ITransaction';

import getRedisKeyHelper from '../helpers/redisHelper';
import pSubEventHelper from '../helpers/pSubEventHelper';
import { FirebaseInstance, RedisInstance } from '..';
import { IUser } from '../config/interfaces/IUser';
import { IBetInDB } from '../config/interfaces/IBet';
import { UnknownError } from '../config/errors/classes/SystemErrors';
import { RafflesService } from './RafflesService';
import Decimal from 'decimal.js';

class BalanceService {
  static async calculateTransactions(userRef: FirebaseFirestore.DocumentReference) {
    const userTransactions = await FirebaseInstance.getManyDocumentsByParam<ITransaction>(
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
    const userBets = await FirebaseInstance.getManyDocumentsByParam<IBetInDB>(
      'bets',
      'userRef',
      userRef,
    );
    if (!userBets || userBets.length <= 0) return 0;

    const calc = userBets.reduce((acc, bet) => {
      if (
        typeof bet.result.amountBet !== 'number' ||
        typeof bet.result.prize !== 'number'
      ) {
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
    const userRef = (await FirebaseInstance.getDocumentRef<IUser>('users', userDocId))
      .result;

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

  // Function to display the balance (not trustable since if there's any value in cache, it will delivery it)
  static async getBalance(userDocId: string): Promise<{ balance: number }> {
    const cacheKey = getRedisKeyHelper('last_balance_att', userDocId);
    const balance = await RedisInstance.get<{ balance: number }>(cacheKey, {
      isJSON: true,
    });

    return balance ? balance : await BalanceService.hardUpdateBalances(userDocId);
    // Potential Errors: RedisError || UnexpectedDatabaseError
  }

  // Do not recalculate all the transaction, only adds a value received to the in cache saved balance (Cache, Client)
  static async softUpdateBalances(
    userDocId: string,
    { option, value }: { option: 'add' | 'remove'; value: number },
  ) {
    try {
      const { balance } = await BalanceService.getBalance(userDocId);
      let newBalance: { balance: number };

      /* DECIMAL Lib utilizada para decimais precisos */
      const valueToChangerDECIMAL = new Decimal(value);
      const balanceDECIMAL = new Decimal(balance);

      if (option === 'add') {
        newBalance = { balance: balanceDECIMAL.plus(valueToChangerDECIMAL).toNumber() };
      } else if (option === 'remove') {
        newBalance = { balance: balanceDECIMAL.minus(valueToChangerDECIMAL).toNumber() };
      } else {
        throw new Error('Invalid option provided');
      }

      const cacheKey = getRedisKeyHelper('last_balance_att', userDocId);
      await RedisInstance.set(cacheKey, newBalance, { isJSON: true });

      pSubEventHelper(
        'GET_LIVE_BALANCE',
        'getLiveBalance',
        { success: true, message: 'GET_MSG', data: newBalance },
        userDocId,
      );

      return newBalance.balance;
    } catch (error) {
      console.error('Error in softUpdateBalances:', error);
      throw error;
    }
  }
}

export default BalanceService;
