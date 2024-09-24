// Plugin to send GraphQL request errors to Sentry

import * as Sentry from '@sentry/node';
import { ApolloServerPlugin, BaseContext, GraphQLRequestListener } from '@apollo/server';

export function sentryPlugin(): ApolloServerPlugin {
  return {
    async requestDidStart(): Promise<GraphQLRequestListener<BaseContext>> {
      return {
        async didEncounterErrors({ errors }: any) {
          try {
            errors.forEach((error: any) => {
              Sentry.captureException(error.originalError || error);
            });
          } catch (error: any) {
            throw new Error(error);
          }
        },
      };
    },
  };
}
