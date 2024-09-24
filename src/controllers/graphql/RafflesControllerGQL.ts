import { FirebaseInstance } from '../..';
import { IRafflesControllerGQL, IRafflesInRedis } from '../../config/interfaces/RaffleInterfaces/IRaffles';
import { IUser } from '../../config/interfaces/IUser';
import RaffleUtils from '../../services/RaffleServices/RaffleUtils';

class RafflesControllerGQL implements IRafflesControllerGQL {
  async getRafflesCache(): Promise<IRafflesInRedis> {
    const allRaffles = await RaffleUtils.getRafflesCache();

    return allRaffles;
  }

  async getRaffles(userDocId: string) {
    const userData = await FirebaseInstance.getDocumentById<IUser>('users', userDocId);
    return userData;
  }
}

export default new RafflesControllerGQL();
