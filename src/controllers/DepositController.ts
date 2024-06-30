import { NextFunction, Request, Response } from 'express';
import { responseBody } from '../helpers/responseHelpers';
import validateAuth from '../common/validateAuth';
import DepositService from '../services/DepositService';
import PayloadValidator from '../services/PayloadValidator';
import { IGetDepositWalletResponse } from '../config/interfaces/IDeposit';

class DepositController {
  /*   async getDepositMethods(req: Request, res: Response, next: NextFunction) {
    try {
      const { authorization = null } = req.headers;
      await validateAuth(authorization);

      const depositMethods = await DepositService.getDepositMethods();

      return res.status(200).json(responseBody(true, 'GET_DEPOSIT_METHODS', 'GET_MSG', depositMethods));
    } catch (err) {
      next(err);
    }
  } */

  async getDepositWallet(req: Request, res: Response, next: NextFunction) {
    try {
      const { authorization = null } = req.headers;
      const payload = req.body;

      const { jwtPayload } = await validateAuth(authorization);

      const validatedPayload = PayloadValidator.verifyGetDepositWalletPayload(payload);
      const walletAddress = await DepositService.getDepositWallet(jwtPayload.userDocId, validatedPayload);

      return res
        .status(200)
        .json(responseBody<IGetDepositWalletResponse>(true, 'REDEEM_CODE', 'REDEEM_CODE_MSG', walletAddress));
    } catch (err) {
      next(err);
    }
  }

  async redeemCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { authorization = null } = req.headers;
      const payload = req.body;

      const { jwtPayload } = await validateAuth(authorization);

      await DepositService.redeemCode(jwtPayload.userDocId, payload);

      return res.status(200).json(responseBody(true, 'REDEEM_CODE', 'REDEEM_CODE_MSG', null));
    } catch (err) {
      next(err);
    }
  }
}

export default new DepositController();
