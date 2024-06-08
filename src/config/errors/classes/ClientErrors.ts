// Errors occurred because of unauthorized or invalid requests by the user (shared with client)
import PubSubEventManager from '../../../services/PubSubEventManager';
import { RESPONSE_CONFIG } from '../../constants/RESPONSES';

export interface IPubSubConfig {
  userId: string;
  reqType: 'CREATE_RAFFLE' | 'BUY_RAFFLE_TICKET';
}

export abstract class ClientError extends Error {
  private status: number;

  constructor(status: number, message: string, type: string) {
    super(message);
    this.name = `Client Error - ${type}`;
    this.status = status;
  }

  getStatus() {
    return this.status;
  }
}

export class GenericError extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.GENERIC_MSG) {
    super(500, message, RESPONSE_CONFIG.ERROR.TYPES.Generic);
  }
}

export class UserNotFound extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.USER_NOT_FOUND) {
    super(400, message, RESPONSE_CONFIG.ERROR.TYPES.Database);
  }
}

export class AuthError extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.AUTH_MSG) {
    super(401, message, RESPONSE_CONFIG.ERROR.TYPES.Authorization);
  }
}

export class InvalidUsername extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.INVALID_USERNAME) {
    super(401, message, RESPONSE_CONFIG.ERROR.TYPES.Authorization);
  }
}

export class InvalidPassword extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.INVALID_PASSWORD) {
    super(401, message, RESPONSE_CONFIG.ERROR.TYPES.Authorization);
  }
}

export class JWTExpiredError extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.JWT_EXPIRED) {
    super(401, message, RESPONSE_CONFIG.ERROR.TYPES.Authorization);
  }
}

export class UsernameAlreadyExistsError extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.USERNAME_ALREADY_EXISTS) {
    super(400, message, RESPONSE_CONFIG.ERROR.TYPES.UserInfo);
  }
}

export class EmailAlreadyExistsError extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.EMAIL_ALREADY_EXISTS) {
    super(400, message, RESPONSE_CONFIG.ERROR.TYPES.UserInfo);
  }
}

export class UserUpdateInfoError extends ClientError {
  constructor(message: string) {
    super(400, message, RESPONSE_CONFIG.ERROR.TYPES.UserInfo);
  }
}

export class WalletVerificationError extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.WALLET_VERIFICATION) {
    super(400, message, RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.WALLET_VERIFICATION);
  }
}

export class WalletAlreadyVerifiedError extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.WALLET_ALREADY_VERIFIED) {
    super(400, message, RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.WALLET_ALREADY_VERIFIED);
  }
}

export class CodeNotFound extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.CODE_NOT_FOUND) {
    super(400, message, RESPONSE_CONFIG.ERROR.TYPES.Deposit);
  }
}

export class CodeUsageLimitError extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.CODE_USAGE_LIMIT) {
    super(400, message, RESPONSE_CONFIG.ERROR.TYPES.Deposit);
  }
}

export class CodeAlreadyUsed extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.CODE_ALREADY_USED) {
    super(400, message, RESPONSE_CONFIG.ERROR.TYPES.Deposit);
  }
}

export class InsufficientBalanceError extends ClientError {
  constructor(
    pubSubConfig: IPubSubConfig,
    message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.INSUFFICIENT_BALANCE,
  ) {
    super(400, message, RESPONSE_CONFIG.ERROR.TYPES.Game);

    PubSubEventManager.publishEvent(
      'GET_LIVE_MESSAGES',
      {
        success: false,
        type: pubSubConfig.reqType,
        message: 'INSUFFICIENT_BALANCE',
        data: '',
      },
      pubSubConfig.userId,
    );
  }
}

export class GameAlreadyFinished extends ClientError {
  constructor(
    pubSubConfig: IPubSubConfig,
    message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.GAME_ALREADY_FINISHED,
  ) {
    super(400, message, RESPONSE_CONFIG.ERROR.TYPES.Game);

    PubSubEventManager.publishEvent(
      'GET_LIVE_MESSAGES',
      {
        success: false,
        type: pubSubConfig.reqType,
        message: 'GAME_ALREADY_FINISHED',
        data: '',
      },
      pubSubConfig.userId,
    );
  }
}

export class TicketAlreadyTaken extends ClientError {
  constructor(
    ticketsNumbers: number[],
    pubSubConfig: IPubSubConfig,
    message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.TICKET_ALREADY_TAKEN,
  ) {
    super(400, `${message}: ${ticketsNumbers}`, RESPONSE_CONFIG.ERROR.TYPES.Game);

    PubSubEventManager.publishEvent(
      'GET_LIVE_MESSAGES',
      {
        success: false,
        type: pubSubConfig.reqType,
        message: 'TICKET_ALREADY_TAKEN',
        data: '',
      },
      pubSubConfig.userId,
    );
  }
}

export class QuantityExceedsAvailableTickets extends ClientError {
  constructor(
    pubSubConfig: IPubSubConfig,
    message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.QUANTITY_EXCEEDS_AVAILABLE_TICKETS,
  ) {
    super(400, message, RESPONSE_CONFIG.ERROR.TYPES.Game);

    PubSubEventManager.publishEvent(
      'GET_LIVE_MESSAGES',
      {
        success: false,
        type: pubSubConfig.reqType,
        message: 'QUANTITY_EXCEEDS_AVAILABLE_TICKETS',
        data: '',
      },
      pubSubConfig.userId,
    );
  }
}
