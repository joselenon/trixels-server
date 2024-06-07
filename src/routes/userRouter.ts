import { Router } from 'express';
import URLS from '../config/constants/URLS';
import UserController from '../controllers/UserController';

const userRouter = Router();

userRouter.get(URLS.ENDPOINTS.USER.GET_USER_INFO, UserController.getUserInfo);
userRouter.get(URLS.ENDPOINTS.USER.VERIFY_WALLET_CHECK, UserController.verifyWalletCheck);

userRouter.post(URLS.ENDPOINTS.USER.VERIFY_WALLET, UserController.verifyWallet);

userRouter.put(URLS.ENDPOINTS.USER.UPDATE_USER_CREDENTIALS, UserController.updateUserCredentials);

export default userRouter;
