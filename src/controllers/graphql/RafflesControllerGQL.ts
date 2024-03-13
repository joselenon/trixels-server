import { FirebaseInstance } from '../..';
import { IRafflesControllerGQL, IRaffleToFrontEnd } from '../../config/interfaces/IGames';
import { IUser } from '../../config/interfaces/IUser';
import RafflesService from '../../services/RafflesService';

class RafflesControllerGQL implements IRafflesControllerGQL {
  async getAllRaffles(): Promise<{
    activeRaffles: IRaffleToFrontEnd[];
    endedRaffles: IRaffleToFrontEnd[];
  }> {
    const allRaffles = await RafflesService.getAllRaffles();

    return allRaffles;
  }

  async getRaffles(userDocId: string) {
    const userData = await FirebaseInstance.getDocumentById<IUser>('users', userDocId);
    return userData;
  }
}

export default new RafflesControllerGQL();
