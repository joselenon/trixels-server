/* eslint-disable @typescript-eslint/no-var-requires */
import { NextFunction, Request, Response } from 'express';
import { responseBody } from '../helpers/responseHelpers';
import { InvalidPayloadError } from '../config/errors/classes/SystemErrors';
import UserValidator from '../services/UserValidations/UserValidator';
import { AuthError, EmailAlreadyExistsError } from '../config/errors/classes/ClientErrors';
import UserService, { IUpdateUserCredentialsPayload } from '../services/UserService';
import JWTService from '../services/JWTService';
import { IUserToFrontEnd } from '../config/interfaces/IUser';
import CookiesConfig from '../config/app/CookiesConfig';
import AuthService from '../services/AuthService';

class UserController {
  /* TIRAR ISSO DAQUI E COLOCAR EM UM AUTHCONTROLLER REVIEW */
  refreshAccessToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies.refreshToken as string;
      if (!refreshToken || typeof refreshToken !== 'string') throw new AuthError();

      console.log(refreshToken);
      const { accessToken } = await AuthService.refreshAccessToken(refreshToken);

      res.cookie(CookiesConfig.RefreshTokenCookie.key, refreshToken, CookiesConfig.RefreshTokenCookie.config);
      res.cookie(CookiesConfig.JWTCookie.key, accessToken, CookiesConfig.JWTCookie.config);
      res.status(200).json(responseBody(true, 'REFRESH_ACCESS_TOKEN', 'GET_MSG', null));
    } catch (err) {
      next(err);
    }
  };

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

      const isUsernameAvailable = await UserValidator.isUsernameAvailable(username);
      if (!isUsernameAvailable) {
        throw new EmailAlreadyExistsError();
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

  getUserInfo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization;
      const validatedJWT = JWTService.validateJWT({
        token,
        mustBeAuth: false,
      });

      const usernameToQuery = req.query.username as string;
      const requesterUsername = validatedJWT?.username;

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
      const token = req.headers.authorization;
      const validatedJWT = JWTService.validateJWT({ mustBeAuth: true, token });

      if (!validatedJWT) throw new AuthError();
      const { username } = validatedJWT;

      const { email, roninWallet } = req.body;
      if (!email && !roninWallet) throw new InvalidPayloadError();

      const filteredPayload = {} as IUpdateUserCredentialsPayload;

      if (email) filteredPayload.email = email;
      if (roninWallet) filteredPayload.roninWallet = roninWallet;

      await UserService.updateUserCredentials(username, filteredPayload);

      res.status(200).json(responseBody(true, 'UPDATE_USER_CREDENTIALS', 'UPDATE_MSG', null));
    } catch (err) {
      next(err);
    }
  };

  verifyWallet = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization;
      const validatedJWT = JWTService.validateJWT({ mustBeAuth: true, token });

      if (!validatedJWT) throw new AuthError();
      const { userDocId } = validatedJWT;

      const response = await UserService.verifyWallet(userDocId);

      res.status(200).json(responseBody(true, 'UPDATE_USER_CREDENTIALS', 'UPDATE_MSG', response));
    } catch (err) {
      next(err);
    }
  };
}

export default new UserController();
