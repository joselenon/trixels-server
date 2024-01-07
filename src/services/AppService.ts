// Heart of the application
import * as Sentry from '@sentry/node';
import express from 'express';

import SentryConfig from '../config/app/SentryConfig';

import routes from '../routes';
import corsMiddleware from '../middlewares/corsMiddleware';
import { expressJSONMiddleware } from '../middlewares/expressMiddlewares';
import {
  errorHandlerMiddleware,
  requestHandlerMiddleware,
  tracingHandlerMiddleware,
} from '../middlewares/sentryMiddlewares';
import URLS, { API_BASE } from '../config/constants/URLS';

class AppService {
  private app: express.Application;

  constructor() {
    this.app = express();

    /* SENTRY */
    Sentry.init(SentryConfig(this.app));
  }

  private setupMiddlewares(): void {
    this.app.use(corsMiddleware());
    this.app.use(expressJSONMiddleware());

    /* SENTRY */
    this.app.use(requestHandlerMiddleware());

    /* SENTRY */
    this.app.use(tracingHandlerMiddleware());
  }

  private setupEndpoints(): void {
    this.app.use(API_BASE, routes);

    // Final SENTRY middleware
    this.app.use(errorHandlerMiddleware());
  }

  public async initialize() {
    this.setupMiddlewares();
    this.setupEndpoints();

    this.app.listen(URLS.MAIN_URLS.SERVER_PORT, () =>
      console.log(`Server started, ${URLS.MAIN_URLS.SERVER_FULL_URL}`),
    );
  }
}

export default new AppService();
