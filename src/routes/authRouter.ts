import { Router } from 'express';
import URLS from '../config/constants/URLS';
import UserController from '../controllers/UserController';
import GoogleController from '../controllers/GoogleController';

const authRouter = Router();

authRouter.post(URLS.ENDPOINTS.AUTH.REGISTER, UserController.registerUser);
authRouter.post(URLS.ENDPOINTS.AUTH.LOGIN, UserController.loginUser);
authRouter.post(URLS.ENDPOINTS.AUTH.LOGOUT, UserController.logoutUser);
authRouter.post(URLS.ENDPOINTS.AUTH.REFRESH_ACCESS_TOKEN, UserController.refreshAccessToken);

authRouter.get(URLS.ENDPOINTS.AUTH.VALIDATE_ACCESS_TOKEN, UserController.validateAccessToken);

authRouter.post(URLS.ENDPOINTS.AUTH.GOOGLE_LOGIN.initial, GoogleController.initialSignIn);
authRouter.get(URLS.ENDPOINTS.AUTH.GOOGLE_LOGIN.initial, GoogleController.callbackSignIn);

export default authRouter;
