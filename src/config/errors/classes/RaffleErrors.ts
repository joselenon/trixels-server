import { RedisError } from './RedisErrors';
import { SystemError } from './SystemErrors';

export abstract class RaffleError extends SystemError {
  constructor(message: string | undefined = undefined, type: string) {
    super(message, type);
    this.name = `Raffle Error - ${type}`;
  }
}

export class RaffleBuyTransactionError extends RaffleError {
  constructor(message: string | undefined) {
    super(message, 'RaffleBuyTransaction');
  }
}

export class CheckForRaffleFinishingError extends RaffleError {
  constructor(message: string | undefined) {
    super(message, 'CheckForRaffleFinishingError');
  }
}

export class GetRaffleDocumentError extends RaffleError {
  constructor(message: string | undefined) {
    super(message, 'GetRaffleDocumentError');
  }
}

export class GetRaffleCacheError extends RaffleError {
  constructor(message: string | undefined) {
    super(message, 'GetRaffleCacheError');
  }
}

export class GetVariablesError extends RaffleError {
  constructor(message: string | undefined) {
    super(message, 'GetVariablesError');
  }
}

export class SyncBetWithRaffleCacheError extends RedisError {
  constructor(message: string | undefined) {
    super(message, 'UpdateRaffleCacheError');
  }
}
