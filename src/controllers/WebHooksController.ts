import { NextFunction, Request, Response } from 'express';
import { responseBody } from '../helpers/responseHelpers';
import HMACVerifier from '../common/HMACVerifier';
import { UnknownError } from '../config/errors/classes/SystemErrors';
import SkyMavisWebhookService from '../services/SkyMavisWebhookService';

class WebHooksController {
  skyMavis = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const skyMavisSignature = req.headers['x-skymavis-signature'] as string;

      const payload = req.body;
      if (!HMACVerifier(payload, skyMavisSignature)) throw new UnknownError('Invalid signature, webhook forged');

      console.log('Signature is valid!!!');
      await SkyMavisWebhookService.receiveInfo(payload);

      res.status(200).json(responseBody(true, 'GET_USER_INFO', 'GENERIC_MSG', null));
    } catch (err) {
      next(err);
    }
  };
}

export default new WebHooksController();
