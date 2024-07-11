// Errors occurred because of unauthorized or invalid requests by the user (shared with client)
import { RESPONSE_CONFIG } from '../../constants/RESPONSES';
import { ClientError } from './ClientErrors';

export interface IPubSubConfig {
  userId: string;
  reqType: 'CREATE_RAFFLE' | 'BUY_RAFFLE_TICKET';
}

export class UnavailableNetworkError extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.UNAVAILABLE_NETWORK) {
    super(message, RESPONSE_CONFIG.ERROR.TYPES.Deposit, 403);
    this.name = 'UnavailableNetworkError';
  }
}

export class UnavailableTokenError extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.UNAVAILABLE_NETWORK) {
    super(message, RESPONSE_CONFIG.ERROR.TYPES.Deposit, 403);
    this.name = 'UnavailableTokenError';
  }
}
