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
  constructor(message: string, type: string = RESPONSE_CONFIG.ERROR.NAMES.ProcessCreateRaffleItemError) {
    super(`ProcessCreateRaffleItemError: ${message}`, type);
    this.name = 'ProcessCreateRaffleItemError';
  }
}

export class ProcessBuyRaffleTicketItemError extends BalanceUpdateServiceError {
  constructor(message: string, type: string = RESPONSE_CONFIG.ERROR.NAMES.ProcessBuyRaffleTicketItemError) {
    super(`ProcessBuyRaffleTicketItemError: ${message}`, type);
    this.name = 'ProcessBuyRaffleTicketItemError';
  }
}

export class ProcessPayWinnersItemError extends BalanceUpdateServiceError {
  constructor(message: string, type: string = RESPONSE_CONFIG.ERROR.NAMES.ProcessPayWinnersItemError) {
    super(`ProcessPayWinnersItemError: ${message}`, type);
    this.name = 'ProcessPayWinnersItemError';
  }
}

export class ProcessDepositError extends BalanceUpdateServiceError {
  constructor(message: string, type: string = RESPONSE_CONFIG.ERROR.NAMES.ProcessDepositError) {
    super(`ProcessDepositError: ${message}`, type);
    this.name = 'ProcessDepositError';
  }
}

export class ProcessRefundError extends BalanceUpdateServiceError {
  constructor(message: string, type: string = RESPONSE_CONFIG.ERROR.NAMES.ProcessRefundError) {
    super(`ProcessRefundError: ${message}`, type);
    this.name = 'ProcessRefundError';
  }
}
