import { NextFunction, Request, Response } from 'express';
import { responseBody } from '../helpers/responseHelpers';
import DepositService from '../services/DepositService';
import PayloadValidator from '../services/PayloadValidator';
import { IGetDepositWalletResponse } from '../config/interfaces/IDeposit';
import JWTService from '../services/JWTService';

class DepositController {
  async getDepositWallet(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies.accessToken;
      const payload = req.body;

      const { userDoc } = await JWTService.validateJWT(token);

      const validatedPayload = PayloadValidator.verifyGetDepositWalletPayload(payload);
      const walletAddress = await DepositService.getDepositWallet(userDoc.docId, validatedPayload);

      return res
        .status(200)
        .json(responseBody<IGetDepositWalletResponse>(true, 'REDEEM_CODE', 'REDEEM_CODE_MSG', walletAddress));
    } catch (err) {
      next(err);
    }
  }

  async redeemCode(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies.accessToken;
      const payload = req.body;

      const { userDoc } = await JWTService.validateJWT(token);

      await DepositService.redeemCode(userDoc.docId, payload);

      return res.status(200).json(responseBody(true, 'REDEEM_CODE', 'REDEEM_CODE_MSG', null));
    } catch (err) {
      next(err);
    }
  }
}

export default new DepositController();
