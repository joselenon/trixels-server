import * as admin from 'firebase-admin';

import { CodeAlreadyUsedError, CodeNotFoundError, CodeUsageLimitError } from '../config/errors/classes/ClientErrors';
import { IRedeemCodePayload } from '../config/interfaces/IPayloads';

import { FirebaseInstance, RabbitMQInstance } from '..';
import BalanceUpdateService, { IDepositEnv } from './BalanceUpdateService';
import { UnavailableNetworkError, UnavailableTokenError } from '../config/errors/classes/DepositErrors';
import { IGetDepositWalletResponse } from '../config/interfaces/IDeposit';
import IRedemptionCodesInDb from '../config/interfaces/IRedemptionCodes';

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

interface IRedemptionCodeQueueMessage {
  codeValue: string;
  userId: string;
}

class DepositService {
  /*   async getDepositMethods(): Promise<IDepositMethods> {
    return {
      RON: { networks: [{ description: 'Ronin', walletAddress: 'TRIXELS.RON', minimumAmount: 10 }] },
      PIXEL: { networks: [{ description: 'Ronin', walletAddress: 'TRIXELS.RON', minimumAmount: 10 }] },
    };
  } */

  validateRules() {
    /* COLOCAR VERIFICAÇÃO DE RULES PARA RESGATE DE CÓDIGO */
  }

  async getRedemptionCodeInDb(codeValue: string) {
    const codeInDb = await FirebaseInstance.getSingleDocumentByParam<IRedemptionCodesInDb>(
      'redemptionCodes',
      'codeValue',
      codeValue,
    );
    if (!codeInDb) throw new CodeNotFoundError();
    return codeInDb;
  }

  checkRedemptionCodeAvailability(codeInDbData: IRedemptionCodesInDb, userId: string) {
    const { claims, numberOfUses } = codeInDbData.info;
    if (claims.length >= numberOfUses) throw new CodeUsageLimitError({ reqType: 'REDEEM_CODE', userId });

    const userAlreadyClaimed = claims.some((claimRef) => userId === claimRef.id);
    if (userAlreadyClaimed) throw new CodeAlreadyUsedError();
  }

  async updateRedemptionCode() {}

  async startRedeemRedemptionCodeQueue() {
    const handleMessage = async (message: string) => {
      const nowTime = Date.now();

      const messageToJS = JSON.parse(message) as IRedemptionCodeQueueMessage;
      const { codeValue, userId } = messageToJS;

      const { docData: codeDataInDb, docRef: codeRef } = await this.getRedemptionCodeInDb(codeValue);

      /* Re-runs this to validate with current DB status */
      this.checkRedemptionCodeAvailability(codeDataInDb, userId);

      /* Work on this REVIEW */
      this.validateRules();

      const { reward } = codeDataInDb.info;
      const { docRef: userRef } = await FirebaseInstance.getDocumentRefWithData('users', userId);

      await FirebaseInstance.firestore.runTransaction(async (transaction) => {
        transaction.update(codeRef, {
          'info.claims': admin.firestore.FieldValue.arrayUnion(userRef),
        });

        const rpcResponse = await BalanceUpdateService.sendBalanceUpdateRPCMessage<IDepositEnv>({
          userId,
          type: 'deposit',
          env: {
            transactionInfo: {
              type: 'codeRedeem',
              fromAddress: null,
              createdAt: nowTime,
              symbol: 'PIXEL',
              value: reward,
            },
          },
        });
        RabbitMQInstance.checkForErrorsAfterRPC(rpcResponse);
      });
    };

    RabbitMQInstance.consumeMessages('redemptionCodeQueue', async (msg) => {
      await handleMessage(msg);
    });
  }

  async addRedeemCodeToQueue({ codeValue, userId }: IRedemptionCodeQueueMessage) {
    return await RabbitMQInstance.sendMessage('redemptionCodeQueue', { codeValue, userId });
  }

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
    const { codeValue } = payload;
    const { docData } = await this.getRedemptionCodeInDb(codeValue);

    /* Runs this to prevent an already invalid information to be queued */
    this.checkRedemptionCodeAvailability(docData, userDocId);

    await this.addRedeemCodeToQueue({ codeValue, userId: userDocId });
  }
}

export default new DepositService();
