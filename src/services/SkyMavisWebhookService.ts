import { FirebaseInstance } from '..';
import { TRIXELS_WALLET_ADDRESS } from '../config/app/System';
import { IDepositTransactionsInDb } from '../config/interfaces/ITransaction';
import { IUser } from '../config/interfaces/IUser';
import BalanceUpdateService, { IDepositEnv } from './BalanceUpdateService';

// Common interfaces
interface Activity {
  blockHash: string;
  blockNumber: number;
  blockTimeMillis: number;
  contractAddress: string;
  decimals: number;
  fromAddress: string;
  symbol: string;
  toAddress: string;
  tokenStandard: string;
  transactionHash: string;
  value: number;
}

interface Event {
  network: string;
  activities: Activity[];
}

interface WebhookPayload {
  webhookId: string;
  eventId: string;
  createdAt: string;
  type: string;
  event: Event;
}

// ADDRESS_ACTIVITY specific interfaces
interface AddressActivityEvent extends Event {
  activities: AddressActivity[];
}

interface AddressActivity extends Activity {
  category: string;
  erc721TokenId: string;
  rawValue: string;
}

interface IAddressActivityPayload extends WebhookPayload {
  type: 'ADDRESS_ACTIVITY';
  event: AddressActivityEvent;
}

// TOKEN_TRANSFER specific interfaces
interface TokenTransferEvent extends Event {
  activities: TokenTransferActivity[];
}

interface TokenTransferActivity extends Activity {
  tokenId: string;
  valueRaw: string;
}

interface ITokenTransferPayload extends WebhookPayload {
  type: 'TOKEN_TRANSFER';
  event: TokenTransferEvent;
}

// RON_TRANSFER specific interfaces
interface RonTransferEvent extends Event {
  activities: RonTransferActivity[];
}

interface RonTransferActivity extends Activity {
  rawValue: string;
  transferMethod: string;
}

interface IRonTransferPayload extends WebhookPayload {
  type: 'RON_TRANSFER';
  event: RonTransferEvent;
}

class SkyMavisWebhookService {
  async differentActivities(payload: IAddressActivityPayload) {
    await FirebaseInstance.writeDocument('differentActivities', { payload });
  }

  isTrixelsSending(fromAddress: string, toAddress: string) {
    if (fromAddress === TRIXELS_WALLET_ADDRESS && toAddress !== TRIXELS_WALLET_ADDRESS) {
      console.log('Sending tokens...');
      return true;
    }
    return false;
  }

  async findVerifiedUser(fromAddress: string): Promise<string | null> {
    const usersRelatedToAddress = await FirebaseInstance.getManyDocumentsByParam<IUser>(
      'users',
      'roninWallet.value',
      fromAddress,
    );

    const userRelated = usersRelatedToAddress.documents.filter((user) => user.docData.roninWallet.verified);
    return userRelated.length > 0 ? userRelated[0].docId : null;
  }

  async addToQueueForWalletVerification({
    fromAddress,
    nowTime,
    symbol,
    userId,
    value,
    request,
  }: {
    userId: string;
    nowTime: number;
    symbol: string;
    value: number;
    fromAddress: string;
    request: string;
  }) {
    return await BalanceUpdateService.addToQueue<IDepositEnv>({
      userId,
      type: 'walletVerification',
      env: {
        transactionInfo: {
          createdAt: nowTime,
          symbol,
          type: 'deposit',
          value,
          fromAddress,
        },
        request,
      },
    });
  }

  async registerMissedTransaction(nowTime: number, symbol: string, value: number, fromAddress: string) {
    return await FirebaseInstance.writeDocument<IDepositTransactionsInDb>('missedTransactions', {
      createdAt: nowTime,
      symbol,
      value,
      userRef: null,
      type: 'deposit',
      fromAddress,
    });
  }

  async addToDepositQueue(userId: string, nowTime: number, symbol: string, value: number, fromAddress: string) {
    return await BalanceUpdateService.addToQueue<IDepositEnv>({
      userId,
      type: 'deposit',
      env: {
        transactionInfo: {
          createdAt: nowTime,
          symbol,
          type: 'deposit',
          value,
          fromAddress,
        },
      },
    });
  }

  async addressActivity(payload: IAddressActivityPayload) {
    const nowTime = Date.now();
    const { fromAddress, value, symbol, toAddress } = payload.event.activities[0];

    if (this.isTrixelsSending(fromAddress, toAddress)) {
      return;
    }

    let verifiedWalletOwnerId = await this.findVerifiedUser(fromAddress);

    const checkForWalletVerification = await BalanceUpdateService.checkForWalletVerification({
      symbol,
      transactionValue: value,
      fromAddress,
    });

    if (
      checkForWalletVerification.wasAVerification &&
      checkForWalletVerification.userIdRelatedToVerifiedAddress &&
      checkForWalletVerification.request
    ) {
      verifiedWalletOwnerId = checkForWalletVerification.userIdRelatedToVerifiedAddress;
      return await this.addToQueueForWalletVerification({
        userId: verifiedWalletOwnerId,
        nowTime,
        symbol,
        value,
        fromAddress,
        request: checkForWalletVerification.request,
      });
    }

    if (!verifiedWalletOwnerId) {
      return await this.registerMissedTransaction(nowTime, symbol, value, fromAddress);
    }

    if (payload.event.activities.length > 1) {
      return await this.differentActivities(payload);
    }

    return await this.addToDepositQueue(verifiedWalletOwnerId, nowTime, symbol, value, fromAddress);
  }

  filterAddressActivityPayload(payload: IAddressActivityPayload): IAddressActivityPayload {
    return {
      ...payload,
      event: {
        ...payload.event,
        activities: payload.event.activities.map((activity) => {
          return {
            ...activity,
            fromAddress: activity.fromAddress.toLowerCase(),
            toAddress: activity.toAddress.toLowerCase(),
          };
        }),
      },
    };
  }

  async receiveInfo(payload: IAddressActivityPayload | ITokenTransferPayload | IRonTransferPayload) {
    switch (payload.type) {
      case 'ADDRESS_ACTIVITY':
        await this.addressActivity(this.filterAddressActivityPayload(payload) as IAddressActivityPayload);
        break;
      case 'RON_TRANSFER':
        // Handle RON_TRANSFER here
        break;
      case 'TOKEN_TRANSFER':
        // Handle TOKEN_TRANSFER here
        break;
    }
  }
}

export default new SkyMavisWebhookService();
