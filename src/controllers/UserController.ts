/* eslint-disable @typescript-eslint/no-var-requires */
import { NextFunction, Request, Response } from 'express';
import { responseBody } from '../helpers/responseHelpers';
import { InvalidPayloadError } from '../config/errors/classes/SystemErrors';
import UserValidator from '../services/UserValidations/UserValidator';
import { EmailAlreadyExistsError } from '../config/errors/classes/ClientErrors';
import UserService from '../services/UserService';
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
      const { username: usernameToQuery } = req.body;
      const token = req.headers.authorization;

      const validateJWT = JWTService.validateJWT(token);
      const { username: usernameLogged } = validateJWT;

      const userCredentials = await UserService.getUserCredentials(
        usernameLogged,
        usernameToQuery,
      );

      res.status(200).json(responseBody(true, 'GET_MSG', userCredentials));
    } catch (err) {
      next(err);
    }
  };
}

export default new UserController();
