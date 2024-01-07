import { Router } from 'express';

import httpErrorMiddleware from '../middlewares/httpErrorMiddleware';
import itemHistoryPricesRouter from './itemHistoryPricesRouter';
import itemsListingsRouter from './itemsListingsRouter';
import manageResourcesRouter from './manageResourcesRouter';

const router = Router();

router.use('/', itemsListingsRouter);
router.use('/', itemHistoryPricesRouter);
router.use('/', manageResourcesRouter);

router.use(httpErrorMiddleware);

export default router;
