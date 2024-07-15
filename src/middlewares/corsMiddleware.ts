// Control who's allowed to make requests on this application
import cors from 'cors';

import URLS from '../config/constants/URLS';

//FALSE CREDENTIALS!!!!
export default function corsMiddleware() {
  return cors({ origin: URLS.MAIN_URLS.CLIENT_FULL_URL, credentials: true });
}
