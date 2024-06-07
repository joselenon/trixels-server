import { Router } from 'express';

import httpErrorMiddleware from '../middlewares/httpErrorMiddleware';
import userRouter from './userRouter';
import authRouter from './authRouter';
import rafflesRouter from './rafflesRouter';
import webHooksRouter from './webHooksRouter';

const router = Router();

router.use('/', userRouter);
router.use('/', authRouter);
router.use('/', rafflesRouter);
router.use('/', webHooksRouter);

router.use(httpErrorMiddleware);

export default router;
