import { Router } from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import bodyParser from 'body-parser';

import context from '../config/graphql/context';
import URLS, { API_BASE } from '../config/constants/URLS';
import corsMiddleware from '../middlewares/corsMiddleware';

const graphQLRouter = (apolloServer: ApolloServer) => {
  const graphQLRouters = Router();

  graphQLRouters.use(
    `${API_BASE}${URLS.ENDPOINTS.GRAPHQL}`,
    corsMiddleware(),
    bodyParser.json(),
    expressMiddleware(apolloServer, { context }),
  );

  return graphQLRouters;
};

export default graphQLRouter;
