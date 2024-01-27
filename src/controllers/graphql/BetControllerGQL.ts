import { IBetControllerGQL } from '../../config/interfaces/IBet';
import { IJackpotBetPayload } from '../../config/interfaces/IPayloads';
import { IUserJWTPayload } from '../../config/interfaces/IUser';

class BetControllerGQL implements IBetControllerGQL {
  async makeBetOnJackpot(userInfo: IUserJWTPayload, payload: IJackpotBetPayload) {}
}

export default new BetControllerGQL();
