import session from 'express-session';

import URLS from '../config/constants/URLS';
import ENVIRONMENT from '../config/constants/ENVIRONMENT';

export default function sessionsMiddleware() {
  return session({
    secret: URLS.MAIN_URLS.CLIENT_FULL_URL,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: ENVIRONMENT.MODE === 'PRODUCTION' ? true : false } /* Change when HTTPS REVIEW */,
  });
}
