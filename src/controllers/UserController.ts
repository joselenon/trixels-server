/* eslint-disable @typescript-eslint/no-var-requires */
import { NextFunction, Request, Response } from 'express';
import { responseBody } from '../helpers/responseHelpers';
import { InvalidPayloadError } from '../config/errors/classes/SystemErrors';
import { AuthError } from '../config/errors/classes/ClientErrors';
import UserService, { IUpdateUserCredentialsPayload } from '../services/UserService';
import JWTService from '../services/JWTService';
import { IUserToFrontEnd } from '../config/interfaces/IUser';
import CookiesConfig from '../config/app/CookiesConfig';
import AuthService from '../services/AuthService';

class UserController {
  /* TIRAR ISSO DAQUI E COLOCAR EM UM AUTHCONTROLLER REVIEW */
  registerUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, password } = req.body;

      if (!username || typeof username !== 'string') {
        throw new InvalidPayloadError();
      }
      if (!password || typeof password !== 'string') {
        throw new InvalidPayloadError();
      }

      const { userCredentials, userCreatedId } = await UserService.registerUser({
        username,
        password,
      });

      const { accessToken, refreshToken } = await AuthService.genAuthTokens({
        userId: userCreatedId,
        username: userCredentials.username,
      });

      res.cookie(CookiesConfig.RefreshTokenCookie.key, refreshToken, CookiesConfig.RefreshTokenCookie.config);
      res.cookie(CookiesConfig.JWTCookie.key, accessToken, CookiesConfig.JWTCookie.config);
      res.status(200).json(responseBody(true, 'REGISTER_USER', 'REGISTERED_IN', { userCredentials }));
    } catch (err) {
      next(err);
    }
  };

  loginUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, password } = req.body;

      if (!username || typeof username !== 'string') {
        throw new InvalidPayloadError();
      }
      if (!password || typeof password !== 'string') {
        throw new InvalidPayloadError();
      }

      const { userCredentials, userId } = await UserService.loginUser({
        username,
        password,
      });

      const { accessToken, refreshToken } = await AuthService.genAuthTokens({
        userId,
        username: userCredentials.username,
      });

      res.cookie(CookiesConfig.RefreshTokenCookie.key, refreshToken, CookiesConfig.RefreshTokenCookie.config);
      res.cookie(CookiesConfig.JWTCookie.key, accessToken, CookiesConfig.JWTCookie.config);
      res.status(200).json(responseBody(true, 'LOG_USER', 'LOGGED_IN', { userCredentials }));
    } catch (err) {
      next(err);
    }
  };

  logoutUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.clearCookie(CookiesConfig.RefreshTokenCookie.key, CookiesConfig.RefreshTokenCookie.config);
      res.clearCookie(CookiesConfig.JWTCookie.key, CookiesConfig.JWTCookie.config);
      res.status(200).json(responseBody(true, 'LOG_USER', 'LOGGED_IN', null));
    } catch (err) {
      next(err);
    }
  };

  getUserCredentials = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies.accessToken;

      const { userDoc } = await JWTService.validateJWT({
        token,
      });

      const userCredentials = UserService.filterUserInfoToFrontEnd({
        userInfo: userDoc.docData,
        userQueryingIsUserLogged: true,
      });

      res.status(200).json(responseBody<IUserToFrontEnd>(true, 'GET_USER_INFO', 'GET_MSG', userCredentials));
    } catch (err) {
      next(err);
    }
  };

  getUserInfo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies.accessToken;
      const usernameToQuery = req.query.username as string;

      let requesterUsername = undefined;

      try {
        const { userJWTPayload } = await JWTService.validateJWT({
          token,
        });

        requesterUsername = userJWTPayload?.username;
      } catch (err) {
        /* empty */
      }

      if (!usernameToQuery && !requesterUsername) {
        throw new InvalidPayloadError();
      }

      const userCredentials = await UserService.getUserInDb(requesterUsername, usernameToQuery || requesterUsername!);

      res.status(200).json(responseBody<IUserToFrontEnd>(true, 'GET_USER_INFO', 'GET_MSG', userCredentials));
    } catch (err) {
      next(err);
    }
  };

  updateUserCredentials = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies.accessToken;
      const validatedJWT = await JWTService.validateJWT({ token });

      if (!validatedJWT) throw new AuthError();
      const { userDoc } = validatedJWT;

      const { email, roninWallet } = req.body;
      if (!email && !roninWallet) throw new InvalidPayloadError();

      const filteredPayload = {} as IUpdateUserCredentialsPayload;

      if (email) filteredPayload.email = email;
      if (roninWallet) filteredPayload.roninWallet = roninWallet;

      await UserService.updateUserCredentials(userDoc, filteredPayload);

      res.status(200).json(responseBody(true, 'UPDATE_USER_CREDENTIALS', 'UPDATE_MSG', null));
    } catch (err) {
      next(err);
    }
  };

  verifyWallet = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies.accessToken;
      const validatedJWT = await JWTService.validateJWT({ token });

      if (!validatedJWT) throw new AuthError();
      const { userDoc } = validatedJWT;

      const response = await UserService.verifyWallet(userDoc.docId);

      res.status(200).json(responseBody(true, 'WALLET_VERIFICATION', 'WALLET_VERIFICATION', response));
    } catch (err) {
      next(err);
    }
  };

  /* TIRAR ISSO DAQUI E COLOCAR EM UM AUTHCONTROLLER REVIEW */
  refreshAccessToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies.refreshToken as string;
      if (!refreshToken || typeof refreshToken !== 'string') throw new AuthError();

      const { accessToken } = await AuthService.refreshAccessToken(refreshToken);

      res.cookie(CookiesConfig.RefreshTokenCookie.key, refreshToken, CookiesConfig.RefreshTokenCookie.config);
      res.cookie(CookiesConfig.JWTCookie.key, accessToken, CookiesConfig.JWTCookie.config);
      res.status(200).json(responseBody(true, 'REFRESH_ACCESS_TOKEN', 'GET_MSG', null));
    } catch (err) {
      next(err);
    }
  };

  validateAccessToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies.refreshToken;
      const accessToken = req.cookies.accessToken;

      await AuthService.validateAccessToken(refreshToken, accessToken);

      res.status(200).json(responseBody(true, 'REFRESH_ACCESS_TOKEN', 'GET_MSG', null));
    } catch (err) {
      next(err);
    }
  };
}

export default new UserController();
