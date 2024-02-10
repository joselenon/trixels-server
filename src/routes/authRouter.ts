import { Router } from 'express';
import URLS from '../config/constants/URLS';
import UserController from '../controllers/UserController';

const authRouter = Router();

authRouter.post(URLS.ENDPOINTS.AUTH.REGISTER, UserController.registerUser);
authRouter.post(URLS.ENDPOINTS.AUTH.LOGIN, UserController.loginUser);

export default authRouter;
