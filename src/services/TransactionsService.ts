import { FirebaseInstance } from '..';
import { TTransactionToFrontend, TTransactionsInDb, TTransactionsToFrontend } from '../config/interfaces/ITransaction';

class TransactionsService {
  filterTransactionToFrontend(transactionInDb: TTransactionsInDb): TTransactionToFrontend {
    const { userRef } = transactionInDb;

    /* User ref returns empty since the only entity capable of redeem transactions is it's own owner */
    return { ...transactionInDb, userRef: '' };
  }

  async getUserTransactions(
    userRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData, FirebaseFirestore.DocumentData>,
    chunkIndex: number,
  ): Promise<TTransactionsToFrontend> {
    const userTransactions = await FirebaseInstance.getManyDocumentsByParamInChunks<TTransactionsInDb>({
      chunkIndex,
      chunkSize: 10,
      collection: 'transactions',
      orderByField: 'createdAt',
      param: 'userRef',
      paramValue: userRef,
    });

    const transactionsToFrontend =
      userTransactions && userTransactions.map((transaction) => this.filterTransactionToFrontend(transaction.docData));

    return transactionsToFrontend;
  }
}

export default new TransactionsService();
