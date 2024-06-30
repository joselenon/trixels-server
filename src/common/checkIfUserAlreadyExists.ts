import { FirebaseInstance } from '..';
import { IFirebaseResponse } from '../config/interfaces/IFirebase';
import { IUser } from '../config/interfaces/IUser';

const checkIfUsernameExists = async (
  username: string,
): Promise<{ userExists: boolean; data: IFirebaseResponse<IUser> } | false> => {
  const userExists = await FirebaseInstance.getSingleDocumentByParam<IUser>('users', 'username', username);

  if (userExists) {
    return { userExists: !!userExists.docData, data: userExists };
  }

  return false;
};

// If user is not found in DB, it throw an error (DocumentNotFoundError)
const checkIfUserExistsByDocId = async (userDocId: string):Promise<IFirebaseResponse<IUser>>  => {
  const userDoc = await FirebaseInstance.getDocumentRefWithData<IUser>('users', userDocId);
  return userDoc;
};

export { checkIfUsernameExists, checkIfUserExistsByDocId };
