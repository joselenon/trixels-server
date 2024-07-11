import session from 'express-session';

import URLS from '../config/constants/URLS';

export default function sessionsMiddleware() {
  return session({
    secret: URLS.MAIN_URLS.CLIENT_FULL_URL,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true } /* Change when HTTPS REVIEW */,
  });
}
