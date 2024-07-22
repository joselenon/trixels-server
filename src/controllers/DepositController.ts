import { NextFunction, Request, Response } from 'express';
import { responseBody } from '../helpers/responseHelpers';
import DepositService from '../services/DepositService';
import PayloadValidator from '../services/PayloadValidator';
import { IGetDepositWalletResponse } from '../config/interfaces/IDeposit';
import JWTService from '../services/JWTService';
import { InvalidPayloadError } from '../config/errors/classes/SystemErrors';

class DepositController {
  async getDepositWallet(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies.accessToken as string;
      const payload = req.body;

      const { userDoc } = await JWTService.validateJWT({ token: token });

      const validatedPayload = PayloadValidator.verifyGetDepositWalletPayload(payload);
      const walletAddress = await DepositService.getDepositWallet(userDoc.docId, validatedPayload);

      return res.status(200).json(
        responseBody<IGetDepositWalletResponse>({
          success: true,
          type: 'REDEEM_CODE',
          message: 'REDEEM_CODE_MSG',
          data: walletAddress,
        }),
      );
    } catch (err) {
      next(err);
    }
  }

  async redeemCode(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies.accessToken as string;
      const { userDoc } = await JWTService.validateJWT({ token: token });

      const payload = req.body as { codeValue: string };
      if (!payload.codeValue || typeof payload.codeValue !== 'string') throw new InvalidPayloadError();

      await DepositService.redeemCode(userDoc.docId, payload);

      return res
        .status(200)
        .json(responseBody({ success: true, type: 'REDEEM_CODE', message: 'REDEEM_CODE_MSG', data: null }));
    } catch (err) {
      next(err);
    }
  }
}

export default new DepositController();
