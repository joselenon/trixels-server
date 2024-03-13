// Informations shared with all resolvers (graphql context)
import validateAuth from '../../common/validateAuth';
import BetControllerGQL from '../../controllers/graphql/BetControllerGQL';
import UserController from '../../controllers/graphql/UserController';
import IGQLContext from '../interfaces/IGQLContext';
import RafflesControllerGQL from '../../controllers/graphql/RafflesControllerGQL';

export default async function context({ req }: any): Promise<IGQLContext> {
  const jwtToken = req.headers.authorization;

  return {
    validateAuth,
    jwtToken,
    UserController,
    BetControllerGQL,
    RafflesControllerGQL,
  };
}

export async function wsContext(ctx: any): Promise<IGQLContext> {
  const jwtToken = ctx.connectionParams?.Authorization;
  ctx.validateAuth = validateAuth;
  ctx.jwtToken = jwtToken ? jwtToken : '';
  ctx.UserController = UserController;
  ctx.BetControllerGQL = BetControllerGQL;

  return {
    validateAuth,
    jwtToken,
    UserController,
    BetControllerGQL,
    RafflesControllerGQL,
  };
}
