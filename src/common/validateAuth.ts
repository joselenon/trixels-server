import { AuthError } from '../config/errors/classes/ClientErrors';
import { IUser, IUserJWTPayload } from '../config/interfaces/IUser';
import JWTService from '../services/JWTService';
import { checkIfUserExistsByDocId } from './checkIfUserAlreadyExists';

export type TValidateAuthFn = (
  authorization: string | null,
) => Promise<{ jwtPayload: IUserJWTPayload; userInfo: IUser }>;

export interface IAuthValidation {
  jwtPayload: IUserJWTPayload;
  userInfo: IUser;
}

const validateAuth: TValidateAuthFn = async (
  authorization: string | null,
): Promise<IAuthValidation> => {
  if (!authorization) throw new AuthError();

  // Throws an AuthError in case is invalid
  const jwtPayload = JWTService.validateJWT({
    token: authorization,
    mustBeAuth: true,
  });

  if (!jwtPayload) throw new AuthError();

  const userExists = await checkIfUserExistsByDocId(jwtPayload.userDocId);
  if (!userExists.docData) throw new AuthError();

  return { jwtPayload, userInfo: userExists.docData };
};

export default validateAuth;
