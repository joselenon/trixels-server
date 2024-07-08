import { IJWTService } from '../../services/JWTService';
import { IRafflesControllerGQL } from './IRaffles';
import { IUserControllerGQL } from './IUser';

export default interface IGQLContext {
  JWTService: IJWTService;
  jwtToken: string;
  UserController: IUserControllerGQL;
  RafflesControllerGQL: IRafflesControllerGQL;
}
