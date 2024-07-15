import { NextFunction, Request, Response } from 'express';
import { responseBody } from '../helpers/responseHelpers';
import HMACVerifier from '../common/HMACVerifier';
import SkyMavisWebhookService from '../services/SkyMavisWebhookService';

class WebHooksController {
  skyMavis = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const skyMavisSignature = req.headers['x-skymavis-signature'] as string;

      const payload = req.body;
      HMACVerifier(payload, skyMavisSignature);

      console.log('payload', payload);
      await SkyMavisWebhookService.receiveInfo(payload);

      res.status(200).json(responseBody({ success: true, type: 'GET_USER_INFO', message: 'GENERIC_MSG', data: null }));
    } catch (err) {
      next(err);
    }
  };
}

export default new WebHooksController();
