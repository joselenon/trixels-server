import { Router } from 'express';
import URLS from '../config/constants/URLS';
import UserController from '../controllers/UserController';

const userRouter = Router();

userRouter.get(URLS.ENDPOINTS.USER.GET_USER_INFO, UserController.getUserInfo);

userRouter.put(URLS.ENDPOINTS.USER.UPDATE_USER_CREDENTIALS, UserController.updateUserCredentials);

export default userRouter;
