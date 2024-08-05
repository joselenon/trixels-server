import ENVIRONMENT from '../constants/ENVIRONMENT';

const JWT = {
  secret: ENVIRONMENT.JWT_SECRET,
  expirationInSec: 15 /*  * 60 */, // 15 minutes (in seconds)
};

const REFRESH_TOKEN = {
  expirationInSec: 30 * 24 * 60 * 60 /* 30 days */,
};

export default { JWT, REFRESH_TOKEN };
