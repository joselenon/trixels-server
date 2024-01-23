// Heart of the application
import * as Sentry from '@sentry/node';
import express from 'express';
import http from 'http'; // Adicione a biblioteca http
import WebSocket from 'ws'; // Adicione a biblioteca ws

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
  private server: http.Server; // Adicione o servidor HTTP
  private wss: WebSocket.Server; // Adicione o servidor WebSocket

  constructor() {
    this.app = express();
    this.server = http.createServer(this.app); // Crie o servidor HTTP
    this.wss = new WebSocket.Server({ noServer: true }); // Crie o servidor WebSocket

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

    /* CORS WebSocket */
    this.wss.on('headers', (headers, request) => {
      headers.push('Access-Control-Allow-Origin: *');
      headers.push(
        'Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept',
      );
    });
  }

  private setupEndpoints(): void {
    this.app.use(API_BASE, routes);

    // Final SENTRY middleware
    this.app.use(errorHandlerMiddleware());
  }

  private setupWebSocket(): void {
    this.server.on('upgrade', (request, socket, head) => {
      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.wss.emit('connection', ws, request);
      });
    });
  }

  public async initialize() {
    this.setupMiddlewares();
    this.setupEndpoints();
    this.setupWebSocket(); // Adicione a configuração do WebSocket

    this.server.listen(URLS.MAIN_URLS.SERVER_PORT, () =>
      console.log(`Server started, ${URLS.MAIN_URLS.SERVER_FULL_URL}`),
    );
  }
}

export default new AppService();
