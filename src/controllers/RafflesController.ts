import itemsInfo from '../assets/itemsInfo';
import { NextFunction, Request, Response } from 'express';
import { responseBody } from '../helpers/responseHelpers';
import JWTService from '../services/JWTService';
import { IRaffleCreationPayload } from '../config/interfaces/IGames';
import RafflesService from '../services/RafflesService';

class RafflesController {
  getAvailableItems(req: Request, res: Response, next: NextFunction) {
    try {
      const availableItems = itemsInfo;
      res.status(200).json(responseBody(true, 'GET_MSG', availableItems));
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
      RafflesService.verifyRaffleCreationPayloadTypes(raffleCreationPayload);

      await RafflesService.createRaffle(userDocId, raffleCreationPayload);
      res.status(200).json(responseBody(true, 'GET_MSG', null));
    } catch (err) {
      next(err);
    }
  }
}

export default new RafflesController();
