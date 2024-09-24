// Heart of the application
import * as Sentry from '@sentry/node';
import express from 'express';

import { GraphQLSchema } from 'graphql';
import { Disposable } from 'graphql-ws';
import { ApolloServer } from '@apollo/server';
import { Server, createServer } from 'http';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';

import routes from '../routes';
import { typeDefs, resolvers } from '../graphql';
import SentryConfig from '../config/app/SentryConfig';
import corsMiddleware from '../middlewares/corsMiddleware';
import { expressJSONMiddleware, expressURLEncodedMiddleware } from '../middlewares/expressMiddlewares';
import {
  errorHandlerMiddleware,
  requestHandlerMiddleware,
  tracingHandlerMiddleware,
} from '../middlewares/sentryMiddlewares';
import formatError from '../config/graphql/formatError';
import { wsContext } from '../config/graphql/context';
import URLS, { API_BASE } from '../config/constants/URLS';
import graphQLRouter from '../routes/graphQLRouter';
import webSocketServerConfig from '../config/app/server/webSocketServerConfig';
import serverWillStartPlugin from '../config/app/server/serverWillStartPlugin';
import { sentryPlugin } from '../config/app/server/requestDidStartPlugin';
import cookieParser from 'cookie-parser';
import sessionsMiddleware from '../middlewares/sessionsMiddleware';

class AppService {
  private app: express.Application;
  private httpServer: Server;
  private wsServer: WebSocketServer;
  private schema: GraphQLSchema;
  private serverCleanup: Disposable;
  private apolloServer: ApolloServer;

  constructor() {
    this.app = express();

    /* SENTRY */
    Sentry.init(SentryConfig(this.app));

    this.httpServer = createServer(this.app);
    this.schema = makeExecutableSchema({ typeDefs, resolvers });
    this.wsServer = new WebSocketServer(webSocketServerConfig(this.httpServer));
    this.serverCleanup = useServer(
      {
        schema: this.schema,
        // Config. to set context in subscriptions
        context: async (ctx: any) => await wsContext(ctx),
      },
      this.wsServer,
    );
    this.apolloServer = new ApolloServer({
      schema: this.schema,
      formatError,
      plugins: [
        ApolloServerPluginDrainHttpServer({ httpServer: this.httpServer }),
        serverWillStartPlugin(this.serverCleanup),
        sentryPlugin(),
      ],
    });
  }

  private setupMiddlewares(): void {
    this.app.use(cookieParser());
    /*     this.app.use(corsMiddleware()); */
    this.app.use(expressJSONMiddleware());
    this.app.use(expressURLEncodedMiddleware());
    this.app.use(sessionsMiddleware());

    /* SENTRY */
    this.app.use(requestHandlerMiddleware());
    this.app.use(tracingHandlerMiddleware());
  }

  private setupEndpoints(): void {
    this.app.use(graphQLRouter(this.apolloServer));
    this.app.use(API_BASE, routes);
    this.app.use(errorHandlerMiddleware()); // Final SENTRY middleware
  }

  public async initialize() {
    this.setupMiddlewares();

    await this.apolloServer.start();
    this.setupEndpoints();

    this.wsServer.on('listening', () => console.log('Web-socket server started.'));
    this.httpServer.listen(URLS.MAIN_URLS.SERVER_PORT, () =>
      console.log(`Server started, ${URLS.MAIN_URLS.SERVER_FULL_URL}`),
    );
  }
}

export default new AppService();
