import * as admin from 'firebase-admin';

import { CodeAlreadyUsed, CodeNotFound, CodeUsageLimitError } from '../config/errors/classes/ClientErrors';
import { IRedeemCodePayload } from '../config/interfaces/IPayloads';
import { InvalidPayloadError } from '../config/errors/classes/SystemErrors';
import ICode from '../config/interfaces/ICode';

import { FirebaseInstance } from '..';
import { ICreateTransactionPayload } from '../config/interfaces/ITransaction';
import BalanceUpdateService, { IDepositEnv } from './BalanceUpdateService';
import { UnavailableNetworkError, UnavailableTokenError } from '../config/errors/classes/DepositErrors';
import { IGetDepositWalletResponse } from '../config/interfaces/IDeposit';

/* export type TMethodInfo = {
  networks: { description: string; walletAddress: string; minimumAmount: number }[];
};

export interface IDepositMethods {
  [symbol: string]: TMethodInfo;
} */

export interface IGetDepositWalletPayload {
  symbol: string;
  network: string;
}

class DepositService {
  /*   async getDepositMethods(): Promise<IDepositMethods> {
    return {
      RON: { networks: [{ description: 'Ronin', walletAddress: 'TRIXELS.RON', minimumAmount: 10 }] },
      PIXEL: { networks: [{ description: 'Ronin', walletAddress: 'TRIXELS.RON', minimumAmount: 10 }] },
    };
  } */

  async getDepositWallet(userDocId: string, payload: IGetDepositWalletPayload): Promise<IGetDepositWalletResponse> {
    const { network, symbol } = payload;

    const networkList = ['Ronin'];
    const tokensList = ['PIXEL', 'RON'];

    if (!networkList.includes(network)) {
      throw new UnavailableNetworkError();
    }

    if (!tokensList.includes(symbol)) {
      throw new UnavailableTokenError();
    }

    /*
    Lógica para checar se o tipo de moeda e rede está funcionando com o sistema
    if (network && symbol) {
    }
    */

    return { walletAddress: 'TRIXELS.RON', minimumDeposit: 5 };
  }

  /* REVISAR */
  async redeemCode(userDocId: string, payload: IRedeemCodePayload) {
    const nowTime = Date.now();
    if (!payload.code) throw new InvalidPayloadError();

    const { code } = payload;

    await FirebaseInstance.firestore.runTransaction(async (transaction) => {
      const codeInfo = await FirebaseInstance.getSingleDocumentByParam<ICode>('redemptionCodes', 'name', code);
      if (!codeInfo || !codeInfo.docData) throw new CodeNotFound();

      const { docRef: codeRef, docData: codeData } = codeInfo;
      const { nUsers, claims, value } = codeData;

      if (claims.length >= nUsers) throw new CodeUsageLimitError();

      const userAlreadyClaimed = claims.some((claimRef) => userDocId === claimRef.id);
      if (userAlreadyClaimed) throw new CodeAlreadyUsed();

      const { docId: userId, docRef: userRef } = await FirebaseInstance.getDocumentRefWithData('users', userDocId);
      const payload = {
        claims: admin.firestore.FieldValue.arrayUnion(userRef),
      };

      transaction.update(codeRef, payload);

      const transactionFullPayload: ICreateTransactionPayload = {
        symbol: 'PIXEL',
        type: 'deposit',
        userRef,
        value,
        createdAt: nowTime,
      };

      const rafflesCollectionRef = await FirebaseInstance.getCollectionRef('transactions');
      const newTransactionRef = rafflesCollectionRef.doc();
      transaction.set(newTransactionRef, transactionFullPayload);

      await BalanceUpdateService.addToQueue<IDepositEnv>({
        userId,
        type: 'deposit',
        env: { transactionInfo: { type: 'codeRedeem', fromAddress: null, createdAt: nowTime, symbol: 'PIXEL', value } },
      });
    });
  }
}

export default new DepositService();
