import { FirebaseInstance } from '..';
import { TTransactionToFrontend, TTransactionsInDb, TTransactionsToFrontend } from '../config/interfaces/ITransaction';
import { IGetUserTransactionsPayload } from '../controllers/TransactionsController';

class TransactionsService {
  filterTransactionToFrontend(transactionInDb: TTransactionsInDb): TTransactionToFrontend {
    const { userRef } = transactionInDb;

    /* User ref returns empty since the only entity capable of redeem transactions is it's own owner */
    return { ...transactionInDb, userRef: '' };
  }

  async getUserTransactions(
    userRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData, FirebaseFirestore.DocumentData>,
    payload: IGetUserTransactionsPayload,
  ): Promise<TTransactionsToFrontend> {
    const userTransactions = await FirebaseInstance.getManyDocumentsByParamInChunks<TTransactionsInDb>({
      collection: 'transactions',
      param: 'userRef',
      paramValue: userRef,
      orderByField: 'createdAt',
      chunkSize: 10,
      config: payload,
    });

    if (userTransactions.documents.length <= 0) return { transactions: [], hasMore: false };

    const { documents, hasMore } = userTransactions;
    const transactionsToFrontend = documents.map((transaction) =>
      this.filterTransactionToFrontend(transaction.docData),
    );

    return { transactions: transactionsToFrontend, hasMore };
  }
}

export default new TransactionsService();
