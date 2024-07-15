import { NextFunction, Request, Response } from 'express';
import { responseBody } from '../helpers/responseHelpers';
import TransactionsService from '../services/TransactionsService';
import { InvalidPayloadError } from '../config/errors/classes/SystemErrors';
import JWTService from '../services/JWTService';

export interface IGetUserTransactionsPayload {
  forward: boolean;
  startAfterDocTimestamp?: number;
}

class TransactionsController {
  async getUserTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies.accessToken as string;
      const payload = req.body as IGetUserTransactionsPayload;

      const { userDoc } = await JWTService.validateJWT({ token });
      const { docRef: userRef } = userDoc;

      const { forward, startAfterDocTimestamp } = payload;
      if (typeof forward !== 'boolean') throw new InvalidPayloadError();
      if (startAfterDocTimestamp) {
        if (typeof startAfterDocTimestamp !== 'number') throw new InvalidPayloadError();
      }

      const userTransactions = await TransactionsService.getUserTransactions(userRef, payload);

      return res
        .status(200)
        .json(
          responseBody({ success: true, type: 'GET_USER_TRANSACTIONS', message: 'GET_MSG', data: userTransactions }),
        );
    } catch (err) {
      next(err);
    }
  }
}

export default new TransactionsController();
