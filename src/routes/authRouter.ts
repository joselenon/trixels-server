import { Router } from 'express';
import URLS from '../config/constants/URLS';
import UserController from '../controllers/UserController';

const authRouter = Router();

authRouter.post(URLS.ENDPOINTS.AUTH.USERNAME, UserController.createUser);

export default authRouter;
