import { NextFunction, Request, Response } from 'express';
import { responseBody } from '../helpers/responseHelpers';
import validateAuth from '../common/validateAuth';
import TransactionsService from '../services/TransactionsService';
import { InvalidPayloadError } from '../config/errors/classes/SystemErrors';

class TransactionsController {
  async getUserTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const { authorization = null } = req.headers;
      const { chunkIndex } = req.body;
      console.log(chunkIndex);

      const { jwtPayload, userDoc } = await validateAuth(authorization);
      const { docRef: userRef } = userDoc;

      if (typeof chunkIndex !== 'number') throw new InvalidPayloadError();

      const userTransactions = await TransactionsService.getUserTransactions(userRef, chunkIndex);

      return res.status(200).json(responseBody(true, 'GET_USER_TRANSACTIONS', 'GET_MSG', userTransactions));
    } catch (err) {
      next(err);
    }
  }
}

export default new TransactionsController();
