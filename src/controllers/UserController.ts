/* eslint-disable @typescript-eslint/no-var-requires */
import { NextFunction, Request, Response } from 'express';
import { responseBody } from '../helpers/responseHelpers';
import { InvalidPayloadError } from '../config/errors/classes/SystemErrors';
import UserValidator from '../services/UserValidations/UserValidator';
import { EmailAlreadyExistsError } from '../config/errors/classes/ClientErrors';
import UserService, { IUpdateUserCredentialsPayload } from '../services/UserService';
import JWTService from '../services/JWTService';

class UserController {
  /* TIRAR ISSO DAQUI E COLOCAR EM UM AUTHCONTROLLER */
  createUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username } = req.body;

      if (!username || typeof username !== 'string') {
        throw new InvalidPayloadError();
      }

      const isUsernameAvailable = await UserValidator.isUsernameAvailable(username);

      if (!isUsernameAvailable) {
        throw new EmailAlreadyExistsError();
      }

      const creationUserId = await UserService.register(username);
      const genJWT = JWTService.signJWT({ username, userDocId: creationUserId });

      res.status(200).json(responseBody(true, 'LOGGED_IN', { token: genJWT }));
    } catch (err) {
      next(err);
    }
  };

  getUserCredentials = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usernameToQuery = req.query.username as string;

      const token = req.headers.authorization;

      const validateJWT = JWTService.validateJWT(token);
      const { username: usernameLogged } = validateJWT;

      const userCredentials = await UserService.getUserCredentials(
        usernameLogged,
        usernameToQuery ? usernameToQuery : usernameLogged,
      );

      res.status(200).json(responseBody(true, 'GET_MSG', userCredentials));
    } catch (err) {
      next(err);
    }
  };

  updateUserCredentials = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization;
      const { username } = JWTService.validateJWT(token);

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
      const { userDocId } = JWTService.validateJWT(token);

      const ETHWalletAddress = await UserService.getEthereumDepositWallet(userDocId);

      res.status(200).json(responseBody(true, 'GET_MSG', ETHWalletAddress));
    } catch (err: any) {
      next(err);
    }
  };
}

export default new UserController();
