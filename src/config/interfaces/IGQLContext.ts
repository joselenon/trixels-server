import { TValidateAuthFn } from '../../common/validateAuth';
import { IRafflesControllerGQL } from './IRaffles';
import { IUserControllerGQL } from './IUser';

export default interface IGQLContext {
  validateAuth: TValidateAuthFn;
  jwtToken: string;
  UserController: IUserControllerGQL;
  RafflesControllerGQL: IRafflesControllerGQL;
}
