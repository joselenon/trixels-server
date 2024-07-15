// Format every GraphQL request error before send to client (Client is unable to read what happened in case is not a Client Error)
import { GraphQLFormattedError } from 'graphql/error';
import { RESPONSE_CONFIG } from '../constants/RESPONSES';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function (err: GraphQLFormattedError) {
  if (err.extensions) {
    const errorStacktraces = err.extensions.stacktrace as string[];
    if (errorStacktraces[0].includes('Client Error')) {
      return {
        message: err.message,
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
