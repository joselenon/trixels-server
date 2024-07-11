import session from 'express-session';

import ENVIRONMENT from '../config/constants/ENVIRONMENT';
import URLS from '../config/constants/URLS';

export default function sessionsMiddleware() {
  return session({
    secret: ENVIRONMENT.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: ENVIRONMENT.MODE === 'PRODUCTION' ? true : false,
      sameSite: ENVIRONMENT.MODE === 'PRODUCTION' ? 'strict' : 'lax',
      domain: `${URLS.MAIN_URLS.CLIENT_FULL_URL}`,
      httpOnly: true,
    },
  });
}
