import session from 'express-session';

import ENVIRONMENT from '../config/constants/ENVIRONMENT';
import RedisStore from 'connect-redis';
import { RedisInstance } from '..';

export default function sessionsMiddleware() {
  return session({
    store: new RedisStore({ client: RedisInstance.client }),
    secret: ENVIRONMENT.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: ENVIRONMENT.MODE === 'PRODUCTION',
      sameSite: ENVIRONMENT.MODE === 'PRODUCTION' ? 'strict' : 'lax',
      domain: `.${ENVIRONMENT.DOMAIN}`,
      httpOnly: true,
    },
    genid: (req) => {
      console.log('SESSIONS HERE:', req.session);
      return req.sessionID || (1e8 * Math.random()).toString(36);
    },
  });
}
