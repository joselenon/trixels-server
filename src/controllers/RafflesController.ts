import itemsInfo from '../assets/itemsInfo';
import { NextFunction, Request, Response } from 'express';
import { responseBody } from '../helpers/responseHelpers';
import JWTService from '../services/JWTService';
import { IBuyRaffleTicketsPayload, IBuyRaffleTicketsPayloadRedis } from '../config/interfaces/IBet';
import { IRaffleCreationPayload } from '../config/interfaces/RaffleInterfaces/IRaffleCreation';
import { RabbitMQInstance } from '..';
import PayloadValidator from '../services/PayloadValidator';
import CreateRaffleService from '../services/RaffleServices/CreateRaffleService';
import RaffleUtils from '../services/RaffleServices/RaffleUtils';

class RafflesController {
  getAvailableItems(_: Request, res: Response, next: NextFunction) {
    try {
      const availableItems = itemsInfo;
      res
        .status(200)
        .json(responseBody({ success: true, type: 'GET_AVAILABLE_ITEMS', message: 'GET_MSG', data: availableItems }));
    } catch (error) {
      next(error);
    }
  }

  async createRaffle(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies.accessToken;
      const { userDoc } = await JWTService.validateJWT({
        token,
      })!;

      const raffleCreationPayload = req.body as IRaffleCreationPayload;
      const validatedPayload = PayloadValidator.validateRaffleCreationPayload(raffleCreationPayload);

      const raffleIdResponse = await new CreateRaffleService({
        userDoc,
        raffleCreationPayload: validatedPayload,
      }).create();
      res
        .status(200)
        .json(responseBody({ success: true, type: 'CREATE_RAFFLE', message: 'GET_MSG', data: raffleIdResponse }));
    } catch (error) {
      next(error);
    }
  }

  async addRaffleTicketBuyToQueue(req: Request, res: Response, next: NextFunction) {
    try {
      const nowTime = Date.now();

      const token = req.cookies.accessToken;
      const { userDoc } = await JWTService.validateJWT({
        token,
      });

      const buyRaffleTicketPayload = req.body as IBuyRaffleTicketsPayload;
      RaffleUtils.verifyBuyRaffleTicketPayload(buyRaffleTicketPayload);

      const { gameId, info } = buyRaffleTicketPayload;

      const buyRaffleTicketsPayloadRedis: IBuyRaffleTicketsPayloadRedis = {
        createdAt: nowTime,
        userId: userDoc.docId,
        gameId,
        info,
      };

      await RabbitMQInstance.sendMessage(`raffle:${gameId}`, buyRaffleTicketsPayloadRedis);

      res
        .status(200)
        .json(responseBody({ success: true, type: 'BUY_RAFFLE_TICKET', message: 'TICKET_BUY_SUCCESS', data: null }));
    } catch (error) {
      next(error);
    }
  }
}

export default new RafflesController();
