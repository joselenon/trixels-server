import { Router } from 'express';

import httpErrorMiddleware from '../middlewares/httpErrorMiddleware';
import userRouter from './userRouter';
import authRouter from './authRouter';

const router = Router();

router.use('/', userRouter);
router.use('/', authRouter);

router.use(httpErrorMiddleware);

export default router;
