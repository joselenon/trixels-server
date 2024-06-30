import { AuthError } from '../config/errors/classes/ClientErrors';
import { IFirebaseResponse } from '../config/interfaces/IFirebase';
import { IUser, IUserJWTPayload } from '../config/interfaces/IUser';
import JWTService from '../services/JWTService';
import { checkIfUserExistsByDocId } from './checkIfUserAlreadyExists';

export type TValidateAuthFn = (
  authorization: string | null,
) => Promise<IAuthValidation>;

export interface IAuthValidation {
  jwtPayload: IUserJWTPayload;
  userDoc: IFirebaseResponse<IUser>;
}

const validateAuth: TValidateAuthFn = async (authorization: string | null): Promise<IAuthValidation> => {
  if (!authorization) throw new AuthError();

  // Throws an AuthError in case is invalid
  const jwtPayload = JWTService.validateJWT({
    token: authorization,
    mustBeAuth: true,
  });

  if (!jwtPayload) throw new AuthError();

  const userDoc = await checkIfUserExistsByDocId(jwtPayload.userDocId);
  if (!userDoc.docData) throw new AuthError();

  return { jwtPayload, userDoc };
};

export default validateAuth;
