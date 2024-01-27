import ITransaction from '../config/interfaces/ITransaction';

import getRedisKeyHelper from '../helpers/redisHelper';
import pSubEventHelper from '../helpers/pSubEventHelper';
import { FirebaseInstance, RedisInstance } from '..';
import { IUser } from '../config/interfaces/IUser';
import { IBetDB } from '../config/interfaces/IBet';

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
    const userBets = await FirebaseInstance.getManyDocumentsByParam<IBetDB>(
      'bets',
      'userRef',
      userRef,
    );
    if (!userBets || userBets.length <= 0) return 0;

    const calc = userBets.reduce((acc, bet) => {
      const difference = bet.result.amountReceived - bet.result.amountBet;
      return (acc += difference);
    }, 0);

    return calc;

    // Potential Errors: UnexpectedDatabaseError
  }

  // Recalculate all the transactions and bets in order to update the balance (DB, Cache, Client???)
  static async hardUpdateBalances(userDocId: string) {
    const { result } = await FirebaseInstance.getDocumentRef<IUser>('users', userDocId);

    const balanceCalc =
      (await BalanceService.calculateTransactions(result)) +
      (await BalanceService.calculateBets(result));
    const balanceObj = { balance: balanceCalc };

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
  static async softUpdateBalances(userDocId: string, valueToAdd: number) {
    const { balance } = await BalanceService.getBalance(userDocId);
    const newBalance = { balance: balance + valueToAdd };

    pSubEventHelper(
      'GET_LIVE_BALANCE',
      'getLiveBalance',
      { success: true, message: 'GET_MSG', data: { ...newBalance } },
      userDocId,
    );

    const cacheKey = getRedisKeyHelper('last_balance_att', userDocId);
    await RedisInstance.set(cacheKey, newBalance, { isJSON: true });

    // Potential Errors: RedisError || UnexpectedDatabaseError
  }
}

export default BalanceService;
