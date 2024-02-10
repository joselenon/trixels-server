import { FirebaseInstance } from '../..';
import { IUser, IUserControllerGQL } from '../../config/interfaces/IUser';

class UserController implements IUserControllerGQL {
  async getUser(userDocId: string) {
    const userData = await FirebaseInstance.getDocumentById<IUser>('users', userDocId);
    return userData;
  }
}

export default new UserController();
