import { NextFunction, Request, Response } from 'express';
import * as Sentry from '@sentry/node';

import { errorResponse } from '../helpers/responseHelpers';
import { ClientError } from '../config/errors/classes/ClientErrors';
import { RESPONSE_CONFIG } from '../config/constants/RESPONSES';

const httpErrorMiddleware = (err: Error, req: Request, res: Response, next: NextFunction) => {
  Sentry.captureException(err); // Captures errors to send to Sentry

  console.log('err', err);

  if (err instanceof ClientError) {
    res.json(errorResponse(err.message));
    return next();
  }

  // In case error is not instance of ClientError (displayable ones), throw a generic one
  res.json(errorResponse(RESPONSE_CONFIG.ERROR.CLIENT_ERROR_MSGS.GENERIC_MSG));
  return next();
};

export default httpErrorMiddleware;
