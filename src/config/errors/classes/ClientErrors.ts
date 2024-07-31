// Errors occurred because of unauthorized or invalid requests by the user (shared with client)
import PubSubEventManager, { IPubSubEventPayload } from '../../../services/PubSubEventManager';
import { RESPONSE_CONFIG } from '../../constants/RESPONSES';

export interface IPubSubConfig {
  userId: string;
  reqType: IPubSubEventPayload<null>['type'];
  request?: IPubSubEventPayload<null>['request'];
}

export abstract class ClientError extends Error {
  status: number;
  name: string;
  type: string;

  constructor(message: string, name: string, status: number) {
    super(message);

    this.type = `Client Error`;
    this.name = name;
    this.status = status;
  }
}

export class GenericError extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.GENERIC_ERROR_MSG) {
    super(message, RESPONSE_CONFIG.ERROR.NAMES.GenericError, 404);
  }
}

export class UserNotFound extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.USER_NOT_FOUND) {
    super(message, RESPONSE_CONFIG.ERROR.NAMES.UserNotFound, 403);
  }
}

export class AuthError extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.AUTH_MSG) {
    super(message, RESPONSE_CONFIG.ERROR.NAMES.AuthError, 401);
  }
}

export class InvalidUsernameError extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.INVALID_USERNAME) {
    super(message, RESPONSE_CONFIG.ERROR.NAMES.InvalidUsernameError, 403);
  }
}

export class InvalidPasswordError extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.INVALID_PASSWORD) {
    super(message, RESPONSE_CONFIG.ERROR.NAMES.InvalidPasswordError, 403);
  }
}

export class InvalidLoginMethodError extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.INVALID_LOGIN_METHOD) {
    super(message, RESPONSE_CONFIG.ERROR.NAMES.InvalidLoginMethodError, 403);
  }
}

export class JWTExpiredError extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.JWT_EXPIRED) {
    super(message, RESPONSE_CONFIG.ERROR.NAMES.JWTExpiredError, 401);
  }
}

export class UsernameAlreadyExistsError extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.USERNAME_ALREADY_EXISTS) {
    super(message, RESPONSE_CONFIG.ERROR.NAMES.UsernameAlreadyExistsError, 403);
  }
}

export class EmailAlreadyExistsError extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.EMAIL_ALREADY_EXISTS) {
    super(message, RESPONSE_CONFIG.ERROR.NAMES.EmailAlreadyExistsError, 403);
  }
}

export class UserUpdateInfoError extends ClientError {
  constructor(message: string) {
    super(message, RESPONSE_CONFIG.ERROR.NAMES.UserUpdateInfoError, 403);
  }
}

export class WalletVerificationError extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.WALLET_VERIFICATION_FAILED) {
    super(message, RESPONSE_CONFIG.ERROR.NAMES.WalletVerificationError, 403);
  }
}

export class WalletAlreadyInUseError extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.WALLET_ALREADY_IN_USE) {
    super(message, RESPONSE_CONFIG.ERROR.NAMES.WalletAlreadyInUseError, 403);
  }
}

export class WalletAlreadyVerifiedError extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.WALLET_ALREADY_VERIFIED) {
    super(message, RESPONSE_CONFIG.ERROR.NAMES.WalletAlreadyVerifiedError, 403);
  }
}

export class CodeNotFoundError extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.CODE_NOT_FOUND) {
    super(message, RESPONSE_CONFIG.ERROR.NAMES.CodeNotFoundError, 403);
  }
}

export class CodeAlreadyUsedError extends ClientError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.CODE_ALREADY_USED) {
    super(message, RESPONSE_CONFIG.ERROR.NAMES.CodeAlreadyUsedError, 403);
  }
}

export class CodeUsageLimitError extends ClientError {
  constructor(pubSubConfig: IPubSubConfig, message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.CODE_USAGE_LIMIT) {
    super(message, RESPONSE_CONFIG.ERROR.NAMES.CodeUsageLimitError, 403);

    PubSubEventManager.publishEvent(
      'GET_LIVE_MESSAGES',
      {
        success: false,
        type: pubSubConfig.reqType,
        message: 'CODE_USAGE_LIMIT',
        request: pubSubConfig.request,
        data: '',
      },
      pubSubConfig.userId,
    );
  }
}

export class InsufficientBalanceError extends ClientError {
  constructor(
    pubSubConfig: IPubSubConfig,
    message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.INSUFFICIENT_BALANCE,
  ) {
    super(message, RESPONSE_CONFIG.ERROR.NAMES.InsufficientBalanceError, 403);

    PubSubEventManager.publishEvent(
      'GET_LIVE_MESSAGES',
      {
        success: false,
        type: pubSubConfig.reqType,
        message: 'INSUFFICIENT_BALANCE',
        request: pubSubConfig.request,
        data: '',
      },
      pubSubConfig.userId,
    );
  }
}

export class GameAlreadyFinishedError extends ClientError {
  constructor(
    pubSubConfig: IPubSubConfig,
    message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.GAME_ALREADY_FINISHED,
  ) {
    super(message, RESPONSE_CONFIG.ERROR.NAMES.GameAlreadyFinishedError, 403);

    PubSubEventManager.publishEvent(
      'GET_LIVE_MESSAGES',
      {
        success: false,
        type: pubSubConfig.reqType,
        message: 'GAME_ALREADY_FINISHED',
        request: pubSubConfig.request,
        data: '',
      },
      pubSubConfig.userId,
    );
  }
}

export class TicketAlreadyTakenError extends ClientError {
  constructor(
    ticketsNumbers: number[],
    pubSubConfig: IPubSubConfig,
    message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.TICKET_ALREADY_TAKEN,
  ) {
    super(`${message}: ${ticketsNumbers}`, RESPONSE_CONFIG.ERROR.NAMES.TicketAlreadyTakenError, 403);

    PubSubEventManager.publishEvent(
      'GET_LIVE_MESSAGES',
      {
        success: false,
        type: pubSubConfig.reqType,
        message: 'TICKET_ALREADY_TAKEN',
        request: pubSubConfig.request,
        data: '',
      },
      pubSubConfig.userId,
    );
  }
}

export class QuantityExceedsAvailableTicketsError extends ClientError {
  constructor(
    pubSubConfig: IPubSubConfig,
    message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.QUANTITY_EXCEEDS_AVAILABLE_TICKETS,
  ) {
    super(message, RESPONSE_CONFIG.ERROR.NAMES.QuantityExceedsAvailableTicketsError, 403);

    PubSubEventManager.publishEvent(
      'GET_LIVE_MESSAGES',
      {
        success: false,
        type: pubSubConfig.reqType,
        message: 'QUANTITY_EXCEEDS_AVAILABLE_TICKETS',
        request: pubSubConfig.request,
        data: '',
      },
      pubSubConfig.userId,
    );
  }
}

export class TicketBuyLimitReachedError extends ClientError {
  constructor(
    pubSubConfig: IPubSubConfig,
    message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.QUANTITY_EXCEEDS_AVAILABLE_TICKETS,
  ) {
    super(message, RESPONSE_CONFIG.ERROR.NAMES.TicketBuyLimitReachedError, 403);

    PubSubEventManager.publishEvent(
      'GET_LIVE_MESSAGES',
      {
        success: false,
        type: pubSubConfig.reqType,
        message: 'TICKET_BUY_LIMIT_REACHED',
        request: pubSubConfig.request,
        data: '',
      },
      pubSubConfig.userId,
    );
  }
}

export const ClientErrorMap: { [key: string]: new (...args: any[]) => ClientError } = {
  WalletAlreadyInUseError: WalletAlreadyInUseError,
  GenericError: GenericError,
  UserNotFound: UserNotFound,
  AuthError: AuthError,
  InvalidUsernameError: InvalidUsernameError,
  InvalidPasswordError: InvalidPasswordError,
  InvalidLoginMethodError: InvalidLoginMethodError,
  JWTExpiredError: JWTExpiredError,
  UsernameAlreadyExistsError: UsernameAlreadyExistsError,
  EmailAlreadyExistsError: EmailAlreadyExistsError,
  UserUpdateInfoError: UserUpdateInfoError,
  WalletVerificationError: WalletVerificationError,
  WalletAlreadyVerifiedError: WalletAlreadyVerifiedError,
  CodeNotFoundError: CodeNotFoundError,
  CodeAlreadyUsedError: CodeAlreadyUsedError,
  CodeUsageLimitError: CodeUsageLimitError,
  InsufficientBalanceError: InsufficientBalanceError,
  GameAlreadyFinishedError: GameAlreadyFinishedError,
  TicketAlreadyTakenError: TicketAlreadyTakenError,
  QuantityExceedsAvailableTicketsError: QuantityExceedsAvailableTicketsError,
  TicketBuyLimitReachedError: TicketBuyLimitReachedError,
};
