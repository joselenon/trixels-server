import { Router } from 'express';
import URLS from '../config/constants/URLS';
import ItemsListingsController from '../controllers/ItemsListingsController';

const itemsListingsRouter = Router();

itemsListingsRouter.get(URLS.ENDPOINTS.ITEM_LISTINGS.GET, ItemsListingsController.get);

export default itemsListingsRouter;
