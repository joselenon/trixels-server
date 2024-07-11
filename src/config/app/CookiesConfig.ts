import { CookieOptions } from 'express';

import ENVIRONMENT from '../constants/ENVIRONMENT';
import TokensConfig from './TokensConfig';

const RefreshTokenCookie = {
  key: 'refreshToken',
  config: {
    maxAge: TokensConfig.REFRESH_TOKEN.expirationInSec * 1000 /* 30 days in milisseconds */,
    // Only send in HTTPS
    secure: ENVIRONMENT.MODE === 'PRODUCTION',
    sameSite: ENVIRONMENT.MODE === 'PRODUCTION' ? 'strict' : 'lax',
    domain: `.${ENVIRONMENT.CLIENT_DOMAIN}`,
    httpOnly: true,
  } as CookieOptions,
};

/* accessToken */
const JWTCookie = {
  key: 'accessToken',
  config: {
    /*     maxAge: TokensConfig.JWT.expirationInSec * 1000, */
    // Only send in HTTPS
    secure: ENVIRONMENT.MODE === 'PRODUCTION',
    sameSite: ENVIRONMENT.MODE === 'PRODUCTION' ? 'strict' : 'lax',
    domain: `.${ENVIRONMENT.CLIENT_DOMAIN}`,
  } as CookieOptions,
};

export default { RefreshTokenCookie, JWTCookie };
