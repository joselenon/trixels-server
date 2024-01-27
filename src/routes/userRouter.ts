import { Router } from 'express';
import URLS from '../config/constants/URLS';
import UserController from '../controllers/UserController';

const userRouter = Router();

userRouter.get(
  URLS.ENDPOINTS.USER.GET_USER_CREDENTIALS,
  UserController.getUserCredentials,
);

userRouter.put(
  URLS.ENDPOINTS.USER.UPDATE_USER_CREDENTIALS,
  UserController.updateUserCredentials,
);

userRouter.get(
  URLS.ENDPOINTS.USER.GET_ETHEREUM_DEPOSIT_WALLET,
  UserController.getEthereumDepositWallet,
);

export default userRouter;
