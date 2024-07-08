// Informations shared with all resolvers (graphql context)
import UserController from '../../controllers/graphql/UserController';
import IGQLContext from '../interfaces/IGQLContext';
import RafflesControllerGQL from '../../controllers/graphql/RafflesControllerGQL';
import JWTService from '../../services/JWTService';

export default async function context({ req }: any): Promise<IGQLContext> {
  const jwtToken = req.headers.authorization;

  return {
    JWTService,
    jwtToken,
    UserController,
    RafflesControllerGQL,
  };
}

export async function wsContext(ctx: any): Promise<IGQLContext> {
  const jwtToken = ctx.connectionParams?.Authorization;
  ctx.JWTService = JWTService;
  ctx.jwtToken = jwtToken ? jwtToken : '';
  ctx.UserController = UserController;

  return {
    JWTService,
    jwtToken,
    UserController,
    RafflesControllerGQL,
  };
}
