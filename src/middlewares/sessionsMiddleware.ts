import session from 'express-session';

import ENVIRONMENT from '../config/constants/ENVIRONMENT';

export default function sessionsMiddleware() {
  return session({
    secret: ENVIRONMENT.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: ENVIRONMENT.MODE === 'PRODUCTION' ? true : false,
      sameSite: ENVIRONMENT.MODE === 'PRODUCTION' ? 'strict' : 'lax',
      domain: `${ENVIRONMENT.MODE === 'DEVELOPMENT' ? ENVIRONMENT.CLIENT_DOMAIN : `.${ENVIRONMENT.CLIENT_DOMAIN}.com`}`,
      httpOnly: true,
    },
  });
}
