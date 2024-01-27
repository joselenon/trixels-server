import { AuthError } from '../config/errors/classes/ClientErrors';
import { IUser, IUserJWTPayload } from '../config/interfaces/IUser';
import JWTService from '../services/JWTService';
import { checkIfUserAlreadyExistsByDocId } from './checkIfUserAlreadyExists';

export type TValidateAuthFn = (
  authorization: string | null,
) => Promise<{ validatedJWTPayload: IUserJWTPayload; userInfo: IUser }>;

export interface IAuthValidation {
  validatedJWTPayload: IUserJWTPayload;
  userInfo: IUser;
}

const validateAuth: TValidateAuthFn = async (
  authorization: string | null,
): Promise<IAuthValidation> => {
  if (!authorization) throw new AuthError();

  // Throws an AuthError in case is invalid
  const validatedJWTPayload = JWTService.validateJWT(
    authorization?.replace('Bearer ', ''),
  );

  const userExists = await checkIfUserAlreadyExistsByDocId(validatedJWTPayload.userDocId);
  if (!userExists.docData) throw new AuthError();

  return { validatedJWTPayload, userInfo: userExists.docData };
};

export default validateAuth;
