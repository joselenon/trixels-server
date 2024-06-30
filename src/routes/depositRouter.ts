import { Router } from 'express';

import URLS from '../config/constants/URLS';
import DepositController from '../controllers/DepositController';

const depositRouter = Router();

depositRouter.post(URLS.ENDPOINTS.DEPOSIT.GET_DEPOSIT_WALLET, DepositController.getDepositWallet);
depositRouter.post(URLS.ENDPOINTS.DEPOSIT.REDEEM_CODE, DepositController.redeemCode);

export default depositRouter;
