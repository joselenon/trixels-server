import { Router } from 'express';
import URLS from '../config/constants/URLS';
import WebHooksController from '../controllers/WebHooksController';

const webHooksRouter = Router();

webHooksRouter.post(URLS.ENDPOINTS.WEBHOOKS.SKY_MAVIS, WebHooksController.skyMavis);

export default webHooksRouter;
