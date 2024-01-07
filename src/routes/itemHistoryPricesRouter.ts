import { Router } from 'express';
import URLS from '../config/constants/URLS';
import ItemHistoryPricesController from '../controllers/ItemHistoryPricesController';

const itemHistoryPricesRouter = Router();

itemHistoryPricesRouter.get(
  URLS.ENDPOINTS.ITEM_HISTORY_PRICES.GET,
  ItemHistoryPricesController.get,
);

export default itemHistoryPricesRouter;
