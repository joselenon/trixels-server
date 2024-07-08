import { NextFunction, Request, Response } from 'express';
import { responseBody } from '../helpers/responseHelpers';
import validateAuth from '../common/validateAuth';
import TransactionsService from '../services/TransactionsService';
import { InvalidPayloadError } from '../config/errors/classes/SystemErrors';

export interface IGetUserTransactionsPayload {
  forward: boolean;
  startAfterDocTimestamp?: number;
}

class TransactionsController {
  async getUserTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies.accessToken;
      const payload = req.body as IGetUserTransactionsPayload;

      const { userDoc } = await validateAuth(token);
      const { docRef: userRef } = userDoc;

      const { forward, startAfterDocTimestamp } = payload;
      if (typeof forward !== 'boolean') throw new InvalidPayloadError();
      if (startAfterDocTimestamp) {
        if (typeof startAfterDocTimestamp !== 'number') throw new InvalidPayloadError();
      }

      const userTransactions = await TransactionsService.getUserTransactions(userRef, payload);

      return res.status(200).json(responseBody(true, 'GET_USER_TRANSACTIONS', 'GET_MSG', userTransactions));
    } catch (err) {
      next(err);
    }
  }
}

export default new TransactionsController();
