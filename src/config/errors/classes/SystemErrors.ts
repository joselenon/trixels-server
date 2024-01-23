// Errors occured with the system (not shared with client)
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
  constructor(message: string, type: string = RESPONSE_CONFIG.ERROR.TYPES.Database) {
    super(message, type);
  }
}

export class UnavailableAuthMethod extends SystemError {
  constructor(
    message: string = RESPONSE_CONFIG.ERROR.SYSTEM_ERROR_MSGS.UNAVAILABLE_AUTH_METHOD,
    type: string = RESPONSE_CONFIG.ERROR.TYPES.Authorization,
  ) {
    super(message, type);
  }
}

export class UnexpectedDatabaseError extends DatabaseError {
  constructor(message: string, type: string = RESPONSE_CONFIG.ERROR.TYPES.Generic) {
    super(message, type);
  }
}

export class DocumentNotFoundError extends DatabaseError {
  constructor(
    message: string = RESPONSE_CONFIG.ERROR.SYSTEM_ERROR_MSGS.DOCUMENT_NOT_IN_DB_MSG,
  ) {
    super(message);
  }
}

export class InvalidPayloadError extends DatabaseError {
  constructor(message: string = RESPONSE_CONFIG.ERROR.SYSTEM_ERROR_MSGS.INVALID_PAYLOAD) {
    super(message);
  }
}

export class RedisError extends SystemError {
  constructor(message: string) {
    super(message, RESPONSE_CONFIG.ERROR.TYPES.Redis);
  }
}

export class YoutubeAPIError extends SystemError {
  constructor(message: string) {
    super(message, RESPONSE_CONFIG.ERROR.TYPES.ExternalAPIs);
  }
}

export class RegisterError extends SystemError {
  constructor(message: string) {
    super(message, RESPONSE_CONFIG.ERROR.TYPES.Register);
  }
}

export class EnvVariablesMissingError extends SystemError {
  constructor(
    variables: string[],
    message: string = RESPONSE_CONFIG.ERROR.SYSTEM_ERROR_MSGS.ENV_VARIABLES_MISSING,
  ) {
    super(
      `${message}${variables.join(', ')}`,
      RESPONSE_CONFIG.ERROR.TYPES.EnvVariablesMissing,
    );
  }
}

export class UnknownError extends SystemError {
  constructor(message: string) {
    super(message, RESPONSE_CONFIG.ERROR.TYPES.Unknown);
  }
}
