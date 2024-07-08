// Errors occurred because of unauthorized or invalid requests by the user (shared with client)
import PubSubEventManager from '../../../services/PubSubEventManager';
import { RESPONSE_CONFIG } from '../../constants/RESPONSES';

export interface IPubSubConfig {
  userId: string;
  reqType: 'CREATE_RAFFLE' | 'BUY_RAFFLE_TICKET';
}

export abstract class ClientError extends Error {
  status: number;

  constructor(message: string, type: string, status: number) {
    super(message);
    this.name = `Client Error - ${type}`;
    this.status = status;
  }
}

export class GenericError extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.GENERIC_MSG) {
    super(message, RESPONSE_CONFIG.ERROR.TYPES.Generic, 404);
  }
}

export class UserNotFound extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.USER_NOT_FOUND) {
    super(message, RESPONSE_CONFIG.ERROR.TYPES.Database, 403);
  }
}

export class AuthError extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.AUTH_MSG) {
    super(message, RESPONSE_CONFIG.ERROR.TYPES.Authorization, 401);
  }
}

export class InvalidUsernameError extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.INVALID_USERNAME) {
    super(message, RESPONSE_CONFIG.ERROR.TYPES.Authorization, 403);
  }
}

export class InvalidPasswordError extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.INVALID_PASSWORD) {
    super(message, RESPONSE_CONFIG.ERROR.TYPES.Authorization, 403);
  }
}

export class InvalidLoginMethodError extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.INVALID_LOGIN_METHOD) {
    super(message, RESPONSE_CONFIG.ERROR.TYPES.Authorization, 403);
  }
}

export class JWTExpiredError extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.JWT_EXPIRED) {
    super(message, RESPONSE_CONFIG.ERROR.TYPES.Authorization, 401);
  }
}

export class UsernameAlreadyExistsError extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.USERNAME_ALREADY_EXISTS) {
    super(message, RESPONSE_CONFIG.ERROR.TYPES.UserInfo, 403);
  }
}

export class EmailAlreadyExistsError extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.EMAIL_ALREADY_EXISTS) {
    super(message, RESPONSE_CONFIG.ERROR.TYPES.UserInfo, 403);
  }
}

export class UserUpdateInfoError extends ClientError {
  constructor(message: string) {
    super(message, RESPONSE_CONFIG.ERROR.TYPES.UserInfo, 403);
  }
}

export class WalletVerificationError extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.WALLET_VERIFICATION) {
    super(message, RESPONSE_CONFIG.ERROR.TYPES.WalletVerification, 403);
  }
}

export class WalletAlreadyInUseError extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.WALLET_VERIFICATION) {
    super(message, RESPONSE_CONFIG.ERROR.TYPES.WalletVerification, 403);
  }
}

export class WalletAlreadyVerifiedError extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.WALLET_ALREADY_VERIFIED) {
    super(message, RESPONSE_CONFIG.ERROR.TYPES.WalletVerification, 403);
  }
}

export class CodeNotFound extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.CODE_NOT_FOUND) {
    super(message, RESPONSE_CONFIG.ERROR.TYPES.Deposit, 403);
  }
}

export class CodeUsageLimitError extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.CODE_USAGE_LIMIT) {
    super(message, RESPONSE_CONFIG.ERROR.TYPES.Deposit, 403);
  }
}

export class CodeAlreadyUsed extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.CODE_ALREADY_USED) {
    super(message, RESPONSE_CONFIG.ERROR.TYPES.Deposit, 403);
  }
}

export class InsufficientBalanceError extends ClientError {
  constructor(
    pubSubConfig: IPubSubConfig,
    message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.INSUFFICIENT_BALANCE,
  ) {
    super(message, RESPONSE_CONFIG.ERROR.TYPES.Game, 403);

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
    super(message, RESPONSE_CONFIG.ERROR.TYPES.Game, 403);

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
    super(`${message}: ${ticketsNumbers}`, RESPONSE_CONFIG.ERROR.TYPES.Game, 403);

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
    super(message, RESPONSE_CONFIG.ERROR.TYPES.Game, 403);

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
