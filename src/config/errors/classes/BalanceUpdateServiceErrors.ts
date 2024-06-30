import * as Sentry from '@sentry/node';
import { RESPONSE_CONFIG } from '../../constants/RESPONSES';

abstract class BalanceUpdateServiceError extends Error {
  constructor(message: string, type: string) {
    super(message);
    this.name = 'BalanceUpdateServiceError';

    Sentry.captureException(this, { tags: { type } });
  }
}

export class ProcessCreateRaffleItemError extends BalanceUpdateServiceError {
  constructor(message: string, type: string = RESPONSE_CONFIG.ERROR.TYPES.Game) {
    super(`ProcessCreateRaffleItemError: ${message}`, type);
    this.name = 'ProcessCreateRaffleItemError';
  }
}

export class ProcessBuyRaffleTicketItemError extends BalanceUpdateServiceError {
  constructor(message: string, type: string = RESPONSE_CONFIG.ERROR.TYPES.Game) {
    super(`ProcessBuyRaffleTicketItemError: ${message}`, type);
    this.name = 'ProcessBuyRaffleTicketItemError';
  }
}

export class ProcessPayWinnersItemError extends BalanceUpdateServiceError {
  constructor(message: string, type: string = RESPONSE_CONFIG.ERROR.TYPES.Game) {
    super(`ProcessPayWinnersItemError: ${message}`, type);
    this.name = 'ProcessPayWinnersItemError';
  }
}

export class ProcessDepositError extends BalanceUpdateServiceError {
  constructor(message: string, type: string = RESPONSE_CONFIG.ERROR.TYPES.Deposit) {
    super(`ProcessDepositError: ${message}`, type);
    this.name = 'ProcessDepositError';
  }
}

export class ProcessRefundError extends BalanceUpdateServiceError {
  constructor(message: string, type: string = RESPONSE_CONFIG.ERROR.TYPES.RabbitMQ) {
    super(`ProcessRefundError: ${message}`, type);
    this.name = 'ProcessRefundError';
  }
}
