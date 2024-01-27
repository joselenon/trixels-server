import { TValidateAuthFn } from '../../common/validateAuth';
import { IBetControllerGQL } from './IBet';
import { IUserControllerGQL } from './IUser';

export default interface IGQLContext {
  validateAuth: TValidateAuthFn;
  jwtToken: string;
  UserController: IUserControllerGQL;
  BetControllerGQL: IBetControllerGQL;
}
