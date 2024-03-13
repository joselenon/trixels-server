import { Router } from 'express';
import URLS from '../config/constants/URLS';
import RafflesController from '../controllers/RafflesController';

const rafflesRouter = Router();

rafflesRouter.get(
  URLS.ENDPOINTS.RAFFLES.GET_AVAILABLE_ITEMS,
  RafflesController.getAvailableItems,
);

rafflesRouter.post(URLS.ENDPOINTS.RAFFLES.CREATE_RAFFLE, RafflesController.createRaffle);

export default rafflesRouter;
