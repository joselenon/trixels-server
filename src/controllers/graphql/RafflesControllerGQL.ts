import { FirebaseInstance } from '../..';
import { IRafflesControllerGQL, IRafflesInRedis } from '../../config/interfaces/IRaffles';
import { IUser } from '../../config/interfaces/IUser';
import { RaffleUtils } from '../../services/RafflesServices';

class RafflesControllerGQL implements IRafflesControllerGQL {
  async getAllRaffles(): Promise<IRafflesInRedis> {
    const allRaffles = await RaffleUtils.getAllRaffles();

    return allRaffles;
  }

  async getRaffles(userDocId: string) {
    const userData = await FirebaseInstance.getDocumentById<IUser>('users', userDocId);
    return userData;
  }
}

export default new RafflesControllerGQL();
