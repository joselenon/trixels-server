// Format every GraphQL request error before send to client (Client is unable to read what happened in case is not a Client Error)
import { GraphQLFormattedError } from 'graphql/error';
import { RESPONSE_CONFIG } from '../constants/RESPONSES';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function (error: GraphQLFormattedError) {
  if (error.extensions) {
    const errorStacktraces = error.extensions.stacktrace as string[];
    if (errorStacktraces[0].includes('Client Error')) {
      return {
        message: error.message,
        extensions: {
          code: errorStacktraces[0],
        },
      };
    }
  }

  return {
    message: RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.GENERIC_ERROR_MSG,
    extensions: {
      code: 'UnexpectedError',
    },
  };
}
