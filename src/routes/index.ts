import { Router } from 'express';

import httpErrorMiddleware from '../middlewares/httpErrorMiddleware';
import itemHistoryPricesRouter from './itemHistoryPricesRouter';
import itemsListingsRouter from './itemsListingsRouter';
import manageResourcesRouter from './manageResourcesRouter';
import userRouter from './userRouter';
import authRouter from './authRouter';

const router = Router();

router.use('/', itemsListingsRouter);
router.use('/', itemHistoryPricesRouter);
router.use('/', manageResourcesRouter);
router.use('/', userRouter);
router.use('/', authRouter);

router.use(httpErrorMiddleware);

export default router;
