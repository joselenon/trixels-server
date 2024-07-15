import { InvalidPayloadError } from '../config/errors/classes/SystemErrors';
import {
  IRaffleCreationPayload,
  TRaffleCreationPrizeX,
  TRaffleCreationPrizesWinners,
} from '../config/interfaces/IRaffleCreation';
import { IGetDepositWalletPayload } from './DepositService';

class PayloadValidator {
  static hasProperty(obj: any, key: any): boolean {
    return key in obj;
  }

  static verifyGetDepositWalletPayload(payload: any): IGetDepositWalletPayload {
    if (!this.hasProperty(payload, 'network') || !this.hasProperty(payload, 'symbol')) {
      throw new InvalidPayloadError();
    }

    const forcedPayload = payload as IGetDepositWalletPayload;
    const { network, symbol } = forcedPayload;
    const validatedPayload: IGetDepositWalletPayload = { network, symbol };
    return validatedPayload;
  }

  /* Review and Refactor */
  static validateRaffleCreationPayload(payload: any): IRaffleCreationPayload {
    if (
      !this.hasProperty(payload, 'totalTickets') ||
      !this.hasProperty(payload, 'discountPercentage') ||
      !this.hasProperty(payload, 'privacy') ||
      !this.hasProperty(payload.privacy, 'type') ||
      !this.hasProperty(payload.privacy, 'mode') ||
      !this.hasProperty(payload, 'prizes') ||
      !this.hasProperty(payload, 'description') ||
      !this.hasProperty(payload, 'request')
    ) {
      throw new InvalidPayloadError();
    }

    const isValidPrizes = (prizes: TRaffleCreationPrizesWinners): boolean => {
      /* If no prizes were chosen */
      if (Object.keys(prizes).length <= 0) return false;

      /* If more than 1 prize was chosen */
      if (Object.keys(prizes).length > 1) return false;

      return Object.values(prizes).every(
        (winnerXPrizes) =>
          'info' in winnerXPrizes &&
          Object.values(winnerXPrizes.info).every(
            (prizeX: TRaffleCreationPrizeX) =>
              typeof prizeX.prizeId === 'string' && typeof prizeX.quantity === 'number',
          ),
      );
    };

    if (
      typeof payload.totalTickets !== 'number' ||
      typeof payload.discountPercentage !== 'number' ||
      (payload.privacy.type !== 'public' && payload.privacy.type !== 'private') ||
      (payload.privacy.mode !== 'public' && payload.privacy.mode !== 'guildMembers') ||
      typeof payload.prizes !== 'object' ||
      !isValidPrizes(payload.prizes) ||
      typeof payload.description !== 'string'
    ) {
      throw new InvalidPayloadError();
    }

    const forcedPayload = payload as IRaffleCreationPayload;
    const { description, discountPercentage, privacy, prizes, totalTickets, request } = forcedPayload;
    const validPayload: IRaffleCreationPayload = {
      description,
      discountPercentage,
      privacy,
      prizes,
      totalTickets,
      request,
    };
    return validPayload;
  }
}

export default PayloadValidator;
