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
  async addressActivity(payload: IAddressActivityPayload) {
    console.log('STARTING');

    const nowTime = Date.now();

    /* FIX THIS ([0] is wrong) */
    const { fromAddress, value, symbol, toAddress } = payload.event.activities[0];

    /* FIX THIS (RESOURCE IN CASE TOKENS GET OUT FROM TRIXELS WALLET) */
    if (toAddress !== TRIXELS_WALLET_ADDRESS) {
      console.log('Sending tokens...');
      return;
    }

    const userRelatedToAddress = await FirebaseInstance.getSingleDocumentByParam<IUser>(
      'users',
      'roninWallet.value',
      fromAddress,
    );
    const userId = userRelatedToAddress ? userRelatedToAddress.docId : null;

    /* FIX THIS */
    if (payload.event.activities.length > 1) {
      return await FirebaseInstance.writeDocument('differentActivities', { userId, payload });
    }

    if (!userId) {
      return await FirebaseInstance.writeDocument<IDepositTransactionsInDb>('transactions', {
        createdAt: nowTime,
        symbol,
        value,
        userRef: null,
        type: 'deposit',
        fromAddress,
      });
    }

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

  async receiveInfo(payload: IAddressActivityPayload | ITokenTransferPayload | IRonTransferPayload) {
    switch (payload.type) {
      case 'ADDRESS_ACTIVITY':
        await this.addressActivity(payload as IAddressActivityPayload);
        break;
      case 'RON_TRANSFER':
        break;
      case 'TOKEN_TRANSFER':
        break;
    }
  }
}

export default new SkyMavisWebhookService();
