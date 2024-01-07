import * as Sentry from '@sentry/node';

// Captures info from HTTP requests received by the server and send them to Sentry
export function requestHandlerMiddleware() {
  return Sentry.Handlers.requestHandler();
}

// Tracks request performance (processing time, metrics...)
export function tracingHandlerMiddleware() {
  return Sentry.Handlers.tracingHandler();
}

// Captures erros occurred during HTTP requests processing (used at the end of the middleware chain)
export function errorHandlerMiddleware() {
  return Sentry.Handlers.errorHandler();
}
