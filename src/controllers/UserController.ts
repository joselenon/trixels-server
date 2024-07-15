/* eslint-disable @typescript-eslint/no-var-requires */
import { NextFunction, Request, Response } from 'express';
import { responseBody } from '../helpers/responseHelpers';
import { InvalidPayloadError } from '../config/errors/classes/SystemErrors';
import { AuthError } from '../config/errors/classes/ClientErrors';
import UserService from '../services/UserService';
import JWTService from '../services/JWTService';
import { IUserToFrontEnd } from '../config/interfaces/IUser';
import CookiesConfig from '../config/app/CookiesConfig';
import AuthService from '../services/AuthService';

class UserController {
  /* TIRAR ISSO DAQUI E COLOCAR EM UM AUTHCONTROLLER REVIEW */
  registerUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, password, confirmPassword } = req.body;

      if (!username || typeof username !== 'string') {
        throw new InvalidPayloadError();
      }
      if (!password || typeof password !== 'string') {
        throw new InvalidPayloadError();
      }
      if (!confirmPassword || typeof confirmPassword !== 'string') {
        throw new InvalidPayloadError();
      }
      if (password !== confirmPassword) {
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
      res
        .status(200)
        .json(
          responseBody({ success: true, type: 'REGISTER_USER', message: 'REGISTERED_IN', data: { userCredentials } }),
        );
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
      res
        .status(200)
        .json(responseBody({ success: true, type: 'LOG_USER', message: 'LOGGED_IN', data: { userCredentials } }));
    } catch (err) {
      next(err);
    }
  };

  logoutUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.clearCookie(CookiesConfig.RefreshTokenCookie.key, CookiesConfig.RefreshTokenCookie.config);
      res.clearCookie(CookiesConfig.JWTCookie.key, CookiesConfig.JWTCookie.config);
      res.status(200).json(responseBody({ success: true, type: 'LOG_USER', message: 'LOGGED_IN', data: null }));
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

      res.status(200).json(
        responseBody<IUserToFrontEnd>({
          success: true,
          type: 'GET_USER_INFO',
          message: 'GET_MSG',
          data: userCredentials,
        }),
      );
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

      res.status(200).json(
        responseBody<IUserToFrontEnd>({
          success: true,
          type: 'GET_USER_INFO',
          message: 'GET_MSG',
          data: userCredentials,
        }),
      );
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
      if (typeof email !== 'string' && typeof roninWallet !== 'string') throw new InvalidPayloadError();

      const userToFrontendUpdated = await UserService.updateUserCredentials(userDoc, req.body);

      res.status(200).json(
        responseBody({
          success: true,
          type: 'UPDATE_USER_CREDENTIALS',
          message: 'UPDATE_MSG',
          data: userToFrontendUpdated,
        }),
      );
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

      res.status(200).json(
        responseBody({
          success: true,
          type: 'WALLET_VERIFICATION',
          message: 'WALLET_VERIFICATION_STARTED',
          data: response,
        }),
      );
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
      res
        .status(200)
        .json(responseBody({ success: true, type: 'REFRESH_ACCESS_TOKEN', message: 'GET_MSG', data: null }));
    } catch (err) {
      next(err);
    }
  };

  validateAccessToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies.refreshToken;
      const accessToken = req.cookies.accessToken;

      await AuthService.validateAccessToken(refreshToken, accessToken);

      res.cookie(CookiesConfig.RefreshTokenCookie.key, refreshToken, CookiesConfig.RefreshTokenCookie.config);
      res.cookie(CookiesConfig.JWTCookie.key, accessToken, CookiesConfig.JWTCookie.config);
      res
        .status(200)
        .json(responseBody({ success: true, type: 'REFRESH_ACCESS_TOKEN', message: 'GET_MSG', data: null }));
    } catch (err) {
      next(err);
    }
  };
}

export default new UserController();
