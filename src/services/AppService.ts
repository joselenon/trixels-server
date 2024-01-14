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
import AxiosService from './AxiosService';
import { ItemMarketData } from '../config/interfaces/ItemStatsComponentsProps';

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

    const activeIntervals: NodeJS.Timeout[] = [];

    const fetchItemListings = async (itemName: string) => {
      console.log('ENTROU AQUI, CUIDADO PRA N DAR MERDA');
      console.log(itemName, '- Fetching!');

      const response = await AxiosService<ItemMarketData>({
        url: `https://pixels-server.pixels.xyz/v1/marketplace/item/${itemName}`,
      });
      const data = response.data as ItemMarketData;

      return { [itemName]: { ...data } };
    };

    this.server.listen(URLS.MAIN_URLS.SERVER_PORT, () =>
      console.log(`Server started, ${URLS.MAIN_URLS.SERVER_FULL_URL}`),
    );

    this.wss.on('connection', (ws) => {
      console.log('WebSocket connection established.');

      ws.on('message', (message: string[]) => {
        while (activeIntervals.length > 0) {
          clearInterval(activeIntervals[0]);
          activeIntervals.pop();
        }
        activeIntervals.forEach((interval) => clearInterval(interval));
        if (message.length <= 0) return;

        console.log('INTERVALS AGORA', activeIntervals);

        const messageReceivedParsed = JSON.parse(message);
        console.log('mensagem recebida', messageReceivedParsed);

        const intervalId = setInterval(() => {
          Promise.all(
            messageReceivedParsed.map((itemName: string) => fetchItemListings(itemName)),
          )
            .then((result: { [itemName: string]: ItemMarketData }[]) => {
              const objToSend: { [itemName: string]: ItemMarketData } = {};

              result.forEach((itemMarketData, i) => {
                console.log('OBJ SENT: ', messageReceivedParsed[i]);

                objToSend[messageReceivedParsed[i]] = {
                  listings: itemMarketData[messageReceivedParsed[i]].listings,
                  ownerUsernames: itemMarketData[messageReceivedParsed[i]].ownerUsernames,
                };
              });

              ws.send(JSON.stringify(objToSend));

              console.log('Listagens enviadas com sucesso.');
            })
            .catch((error) => {
              console.error('Erro ao buscar listagens:', error);
            });
        }, 6000);

        activeIntervals.push(intervalId);
      });

      ws.on('close', () => {
        console.log('WebSocket connection closed.');
      });
    });
  }
}

export default new AppService();
