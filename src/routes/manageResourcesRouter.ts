import { Router } from 'express';
import URLS from '../config/constants/URLS';
import SaveResourcesController from '../controllers/ManageResourcesController';

const manageResourcesRouter = Router();

manageResourcesRouter.get(
  URLS.ENDPOINTS.SAVE_RESOURCES.POST,
  SaveResourcesController.get,
);
manageResourcesRouter.post(
  URLS.ENDPOINTS.SAVE_RESOURCES.POST,
  SaveResourcesController.post,
);

export default manageResourcesRouter;
