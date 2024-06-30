import itemsInfo from '../assets/itemsInfo';
import { NextFunction, Request, Response } from 'express';
import { responseBody } from '../helpers/responseHelpers';
import JWTService from '../services/JWTService';
import { IBuyRaffleTicketsPayload, IBuyRaffleTicketsPayloadRedis } from '../config/interfaces/IBet';
import { CreateRaffle, RaffleUtils } from '../services/RafflesServices';
import { IRaffleCreationPayload } from '../config/interfaces/IRaffleCreation';
import { RabbitMQInstance } from '..';
import PayloadValidator from '../services/PayloadValidator';

class RafflesController {
  getAvailableItems(_: Request, res: Response, next: NextFunction) {
    try {
      const availableItems = itemsInfo;
      res.status(200).json(responseBody(true, 'GET_AVAILABLE_ITEMS', 'GET_MSG', availableItems));
    } catch (err) {
      next(err);
    }
  }

  async createRaffle(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.headers.authorization;
      const { userDocId } = JWTService.validateJWT({
        token,
        mustBeAuth: true,
      })!; /* ARRUMAR ESSA FORÇAÇÃO */

      const raffleCreationPayload = req.body as IRaffleCreationPayload;
      const validatedPayload = PayloadValidator.validateRaffleCreationPayload(raffleCreationPayload);

      const raffleIdResponse = await new CreateRaffle({
        userId: userDocId,
        raffleCreationPayload: validatedPayload,
      }).create();
      res.status(200).json(responseBody(true, 'CREATE_RAFFLE', 'GET_MSG', raffleIdResponse));
    } catch (err) {
      next(err);
    }
  }

  async addRaffleTicketBuyToQueue(req: Request, res: Response, next: NextFunction) {
    try {
      const nowTime = Date.now();

      const token = req.headers.authorization;
      const { userDocId } = JWTService.validateJWT({
        token,
        mustBeAuth: true,
      })!; /* ARRUMAR ESSA FORÇAÇÃO */

      const buyRaffleTicketPayload = req.body as IBuyRaffleTicketsPayload;
      RaffleUtils.verifyBuyRaffleTicketPayload(buyRaffleTicketPayload);

      const { gameId, info } = buyRaffleTicketPayload;

      const buyRaffleTicketsPayloadRedis: IBuyRaffleTicketsPayloadRedis = {
        createdAt: nowTime,
        userId: userDocId,
        gameId,
        info,
      };

      await RabbitMQInstance.sendMessage('evenRafflesQueue', buyRaffleTicketsPayloadRedis);

      res.status(200).json(responseBody(true, 'BUY_RAFFLE_TICKET', 'TICKET_BUY_SUCCESS', null));
    } catch (err) {
      next(err);
    }
  }
}

export default new RafflesController();
