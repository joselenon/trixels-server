import { NextFunction, Request, Response } from 'express';
import { responseBody } from '../helpers/responseHelpers';
import { OAuth2Client } from 'google-auth-library';
import ENVIRONMENT from '../config/constants/ENVIRONMENT';
import URLS, { API_URL, CLIENT_FULL_URL } from '../config/constants/URLS';
import { GoogleOAuthSystemError, InvalidPayloadError, UnknownError } from '../config/errors/classes/SystemErrors';
import CookiesConfig from '../config/app/CookiesConfig';
import AuthService from '../services/AuthService';

class GoogleController {
  initialSignIn(req: Request, res: Response, next: NextFunction) {
    try {
      const state = req.body.stateAuth;
      if (!state) throw new UnknownError('Invalid state.');
      req.session.state = state;

      console.log(state);

      /* Requisições do client */
      res.header('Access-Control-Allow-Origin', CLIENT_FULL_URL);
      /* Because it's in HTTP. (remove when deploy to HTTPS) */
      ENVIRONMENT.MODE === 'DEVELOPMENT' && res.header('Referrer-Policy', 'no-referrer-when-downgrade');

      const redirectUri = `${API_URL}${URLS.ENDPOINTS.AUTH.GOOGLE_LOGIN.initial}`;

      const oAuth2Client = new OAuth2Client(
        ENVIRONMENT.GOOGLE_OAUTH_CLIENT_ID,
        ENVIRONMENT.GOOGLE_OAUTH_CLIENT_SECRET_KEY,
        redirectUri,
      );

      const authorizeUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: 'https://www.googleapis.com/auth/userinfo.profile email openid',
        prompt: 'consent',
        state,
      });

      res
        .status(200)
        .json(responseBody({ success: true, type: 'LOG_USER', message: 'GET_MSG', data: { authorizeUrl } }));
    } catch (err) {
      next(err);
    }
  }

  async callbackSignIn(req: Request, res: Response /* , next: NextFunction */) {
    const code = req.query.code as string;
    const state = req.query.state as string;

    if (!code || typeof code !== 'string') throw new InvalidPayloadError('Invalid code');
    if (!state) throw new UnknownError('Invalid state.');

    const storedState = req.session.state;

    console.log('state', state);
    console.log('storedState', storedState);

    if (state !== storedState) {
      throw new UnknownError('State does not match. Possible CSRF attack.');
    }

    try {
      const redirectUri = `${API_URL}${URLS.ENDPOINTS.AUTH.GOOGLE_LOGIN.initial}`;

      const oAuth2Client = new OAuth2Client(
        ENVIRONMENT.GOOGLE_OAUTH_CLIENT_ID,
        ENVIRONMENT.GOOGLE_OAUTH_CLIENT_SECRET_KEY,
        redirectUri,
      );

      const response = await oAuth2Client.getToken(code);
      /* This really is an async operation */
      await oAuth2Client.setCredentials(response.tokens);

      const oAuthUserCredential = oAuth2Client.credentials;
      if (!oAuthUserCredential || !oAuthUserCredential.access_token) throw new GoogleOAuthSystemError();

      const { userCredentials, userDocId } = await AuthService.loginUserThroughGoogle(oAuthUserCredential.access_token);

      const { accessToken, refreshToken } = await AuthService.genAuthTokens({
        userId: userDocId,
        username: userCredentials.username,
      });

      // const dataToJSON = JSON.stringify({ userCredentials, state, accessToken, refreshToken });
      const dataToJSON = JSON.stringify({ success: true, data: { userCredentials, state, accessToken, refreshToken } });

      res.cookie(CookiesConfig.RefreshTokenCookie.key, refreshToken, CookiesConfig.RefreshTokenCookie.config);
      res.cookie(CookiesConfig.JWTCookie.key, accessToken, CookiesConfig.JWTCookie.config);
      res.redirect(`${CLIENT_FULL_URL}/googleauth?data=${encodeURIComponent(dataToJSON)}`);
    } catch (err) {
      const dataToJSON = JSON.stringify({ success: false, data: null });
      res.redirect(`${CLIENT_FULL_URL}/googleauth?data=${encodeURIComponent(dataToJSON)}`);
    }
  }
}

export default new GoogleController();
