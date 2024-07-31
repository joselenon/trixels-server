import * as Sentry from '@sentry/node';
import { RESPONSE_CONFIG } from '../../constants/RESPONSES';

export abstract class SystemError extends Error {
  constructor(message: string, type: string) {
    super(message);
    this.name = `System Error - ${type}`;
    Sentry.captureException(this, { tags: { type } });
  }
}

export abstract class DatabaseError extends SystemError {
  constructor(message: string, type: string = RESPONSE_CONFIG.ERROR.NAMES.DatabaseError) {
    super(message, type);
  }
}

export class UnavailableAuthMethod extends SystemError {
  constructor(
    message: string = RESPONSE_CONFIG.ERROR.SYSTEM_ERROR_MSGS.UNAVAILABLE_AUTH_METHOD,
    type: string = RESPONSE_CONFIG.ERROR.NAMES.UnavailableAuthMethod,
  ) {
    super(message, type);
    this.name = 'UnavailableAuthMethod';
  }
}

export class UnexpectedDatabaseError extends DatabaseError {
  constructor(message: string, type: string = RESPONSE_CONFIG.ERROR.NAMES.UnexpectedDatabaseError) {
    super(message, type);
    this.name = 'UnexpectedDatabaseError';
  }
}

export class DocumentNotFoundError extends DatabaseError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.SYSTEM_ERROR_MSGS.DOCUMENT_NOT_IN_DB_MSG) {
    super(message);
    this.name = 'DocumentNotFoundError';
  }
}

export class InvalidPayloadError extends SystemError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.SYSTEM_ERROR_MSGS.INVALID_PAYLOAD) {
    super(message, RESPONSE_CONFIG.ERROR.SYSTEM_ERROR_MSGS.INVALID_PAYLOAD);
    this.name = 'InvalidPayloadError';
  }
}

export class RedisError extends SystemError {
  constructor(message: string) {
    super(message, RESPONSE_CONFIG.ERROR.NAMES.RedisError);
    this.name = 'RedisError';
  }
}

export class YoutubeAPIError extends SystemError {
  constructor(message: string) {
    super(message, RESPONSE_CONFIG.ERROR.NAMES.YoutubeAPIError);
    this.name = 'YoutubeAPIError';
  }
}

export class RegisterError extends SystemError {
  constructor(message: string) {
    super(message, RESPONSE_CONFIG.ERROR.NAMES.RegisterError);
    this.name = 'RegisterError';
  }
}

export class EnvVariablesMissingError extends SystemError {
  constructor(variables: string[], message: string = RESPONSE_CONFIG.ERROR.SYSTEM_ERROR_MSGS.ENV_VARIABLES_MISSING) {
    super(`${message}${variables.join(', ')}`, RESPONSE_CONFIG.ERROR.NAMES.EnvVariablesMissingError);
    this.name = 'EnvVariablesMissingError';
  }
}

export class UnknownError extends SystemError {
  constructor(message: string) {
    super(message, RESPONSE_CONFIG.ERROR.NAMES.UnknownError);
    this.name = 'UnknownError';
  }
}

export class ForgedWebhookError extends SystemError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.SYSTEM_ERROR_MSGS.FORGED_WEBHOOK) {
    super(message, RESPONSE_CONFIG.ERROR.NAMES.ForgedWebhookError);
    this.name = 'ForgedWebhookError';
  }
}

export class CreateRaffleUnexpectedError extends SystemError {
  constructor(payload: string, message: string = RESPONSE_CONFIG.ERROR.SYSTEM_ERROR_MSGS.CREATE_RAFFLE) {
    super(`${message} - ${payload}`, RESPONSE_CONFIG.ERROR.NAMES.CreateRaffleUnexpectedError);
    this.name = 'CreateRaffleUnexpectedError';
  }
}

export class RaffleLostError extends SystemError {
  constructor(payload: string, message: string = RESPONSE_CONFIG.ERROR.SYSTEM_ERROR_MSGS.RAFFLE_LOST) {
    super(`${message} - ${payload}`, RESPONSE_CONFIG.ERROR.NAMES.RaffleLostError);
    this.name = 'RaffleLostError';
  }
}

export class InvalidJWTError extends SystemError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.SYSTEM_ERROR_MSGS.INVALID_JWT) {
    super(message, RESPONSE_CONFIG.ERROR.NAMES.InvalidJWTError);
  }
}

export class GoogleOAuthSystemError extends SystemError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.SYSTEM_ERROR_MSGS.GOOGLE_OAUTH_SYSTEM) {
    super(message, RESPONSE_CONFIG.ERROR.NAMES.GoogleOAuthSystemError);
  }
}

export class SuspiciousAuthError extends SystemError {
  constructor(payload: string, message: string = RESPONSE_CONFIG.ERROR.SYSTEM_ERROR_MSGS.SUSPICIOUS_AUTH) {
    super(`${message} - ${payload}`, RESPONSE_CONFIG.ERROR.NAMES.SuspiciousAuthError);
  }
}

export class InvalidRefreshToken extends SystemError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.AUTH_MSG) {
    super(message, RESPONSE_CONFIG.ERROR.NAMES.InvalidRefreshToken);
  }
}

export class BlacklistedTokenError extends SystemError {
  constructor(payload: string, message: string = RESPONSE_CONFIG.ERROR.SYSTEM_ERROR_MSGS.BLACKLISTED_TOKEN) {
    super(`${message} - ${payload}`, RESPONSE_CONFIG.ERROR.NAMES.BlacklistedTokenError);
  }
}
