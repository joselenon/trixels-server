import { CookieOptions } from 'express';

import JWTConfig from './JWTConfig';
import ICookieConfig from '../interfaces/ICookieConfig';
import ENVIRONMENT from '../constants/ENVIRONMENT';

export const JWTCookie = {
  key: 'token',
  config: {
    maxAge: JWTConfig.expiration,
    secure: true,
    domain: `${
      ENVIRONMENT.MODE === 'DEVELOPMENT'
        ? ENVIRONMENT.DOMAIN
        : `.${ENVIRONMENT.DOMAIN}.com`
    }`,
  } as CookieOptions,
};

export const CookiesConfig: ICookieConfig[] = [JWTCookie];
