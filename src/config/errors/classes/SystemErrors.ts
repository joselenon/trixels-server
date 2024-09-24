import * as Sentry from '@sentry/node';

export abstract class SystemError extends Error {
  constructor(message: string | undefined = undefined, type: string) {
    super(message);
    this.name = `System Error - ${type}`;
    Sentry.captureException(this, { tags: { type } });
  }
}

export class UnavailableAuthMethod extends SystemError {
  constructor(message: string | undefined = undefined) {
    super(message, 'UnavailableAuthMethod');
  }
}

export class UnexpectedDatabaseError extends SystemError {
  constructor(message: string | undefined = undefined) {
    super(message, 'UnexpectedDatabaseError');
  }
}

export class DocumentNotFoundError extends SystemError {
  constructor(message: string | undefined = undefined) {
    super(message, 'DocumentNotFoundError');
  }
}

export class InvalidPayloadError extends SystemError {
  constructor(message: string | undefined = undefined) {
    super(message, 'InvalidPayloadError');
  }
}

export class RegisterError extends SystemError {
  constructor(message: string | undefined = undefined) {
    super(message, 'RegisterError');
  }
}

export class EnvVariablesMissingError extends SystemError {
  constructor(variables: string[]) {
    super(`You forgot some environment variables: ${variables.join(', ')}`, 'EnvVariablesMissingError');
  }
}

export class UnknownError extends SystemError {
  constructor(message: string) {
    super(message, 'UnknownError');
  }
}

export class ForgedWebhookError extends SystemError {
  constructor(message: string | undefined = undefined) {
    super(message, 'ForgedWebhookError');
  }
}

export class CreateRaffleUnexpectedError extends SystemError {
  constructor(message: string | undefined = undefined) {
    super(message, 'CreateRaffleUnexpectedError');
  }
}

export class RaffleLostError extends SystemError {
  constructor(message: string | undefined = undefined) {
    super(message, 'RaffleLostError');
  }
}

export class InvalidJWTError extends SystemError {
  constructor(message: string | undefined = undefined) {
    super(message, 'InvalidJWTError');
  }
}

export class GoogleOAuthSystemError extends SystemError {
  constructor(message: string | undefined = undefined) {
    super(message, 'GoogleOAuthSystemError');
  }
}

export class SuspiciousAuthError extends SystemError {
  constructor(message: string | undefined = undefined) {
    super(message, 'SuspiciousAuthError');
  }
}

export class InvalidRefreshToken extends SystemError {
  constructor(message: string | undefined = undefined) {
    super(message, 'InvalidRefreshToken');
  }
}

export class BlacklistedTokenError extends SystemError {
  constructor(message: string | undefined = undefined) {
    super(message, 'BlacklistedTokenError');
  }
}

export class RaffleNotFound extends SystemError {
  constructor(message: string | undefined = undefined) {
    super(message, 'RaffleNotFound');
  }
}

export class RafflesNotSync extends SystemError {
  constructor(message: string | undefined = undefined) {
    super(message, 'RafflesNotSync');
  }
}
