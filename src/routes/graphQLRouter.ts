import { Router } from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import bodyParser from 'body-parser';

import context from '../config/graphql/context';
import URLS, { API_BASE } from '../config/constants/URLS';

const graphQLRouter = (apolloServer: ApolloServer) => {
  const graphQLRouters = Router();

  graphQLRouters.use(
    `${API_BASE}${URLS.ENDPOINTS.GRAPHQL}`,
    bodyParser.json(),
    expressMiddleware(apolloServer, { context }),
  );

  return graphQLRouters;
};

export default graphQLRouter;
