import { FirebaseInstance } from '..';
import { IUser } from '../config/interfaces/IUser';

// If user is not found in DB, it throw an error (DocumentNotFoundError)
const checkIfUserAlreadyExistsByDocId = async (userDocId: string) => {
  const userExists = await FirebaseInstance.getDocumentRef<IUser>('users', userDocId);
  return userExists;
};

export { checkIfUserAlreadyExistsByDocId };
