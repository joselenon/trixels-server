import ENVIRONMENT from '../constants/ENVIRONMENT';

const JWTConfig = {
  secret: ENVIRONMENT.JWT_SECRET,
  expiration: 5 * 24 * 60 * 60, // 5 days (in seconds)
};

export default JWTConfig;
