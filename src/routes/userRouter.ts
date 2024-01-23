import { Router } from 'express';
import URLS from '../config/constants/URLS';
import UserController from '../controllers/UserController';

const userRouter = Router();

userRouter.get(URLS.ENDPOINTS.USER.GET, UserController.getUserCredentials);

export default userRouter;
