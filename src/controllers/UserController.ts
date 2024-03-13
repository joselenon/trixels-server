/* eslint-disable @typescript-eslint/no-var-requires */
import { NextFunction, Request, Response } from 'express';
import { responseBody } from '../helpers/responseHelpers';
import { InvalidPayloadError } from '../config/errors/classes/SystemErrors';
import UserValidator from '../services/UserValidations/UserValidator';
import {
  AuthError,
  EmailAlreadyExistsError,
} from '../config/errors/classes/ClientErrors';
import UserService, { IUpdateUserCredentialsPayload } from '../services/UserService';
import JWTService from '../services/JWTService';
import { IUserToFrontEnd } from '../config/interfaces/IUser';

class UserController {
  /* TIRAR ISSO DAQUI E COLOCAR EM UM AUTHCONTROLLER */
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
      const genJWT = JWTService.signJWT({ username, userDocId: userCreatedId });

      res
        .status(200)
        .json(responseBody(true, 'LOGGED_IN', { userCredentials, token: genJWT }));
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

      const genJWT = JWTService.signJWT({ username, userDocId: userId });

      res
        .status(200)
        .json(responseBody(true, 'LOGGED_IN', { userCredentials, token: genJWT }));
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

      const userCredentials = await UserService.getUserInDb(
        requesterUsername,
        usernameToQuery || requesterUsername!,
      );

      res
        .status(200)
        .json(responseBody<IUserToFrontEnd>(true, 'GET_MSG', userCredentials));
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

      res.status(200).json(responseBody(true, 'UPDATE_MSG', null));
    } catch (err) {
      next(err);
    }
  };

  getEthereumDepositWallet = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization;

      const validatedJWT = JWTService.validateJWT({ mustBeAuth: true, token });
      if (!validatedJWT) throw new AuthError();

      const { userDocId } = validatedJWT;

      const ETHWalletAddress = await UserService.getEthereumDepositWallet(userDocId);

      res.status(200).json(responseBody(true, 'GET_MSG', ETHWalletAddress));
    } catch (err: any) {
      next(err);
    }
  };
}

export default new UserController();
