import { FirebaseInstance } from '..';
import { IFirebaseQueryResponse } from '../config/interfaces/IFirebase';
import { IUser } from '../config/interfaces/IUser';

const checkIfUsernameExists = async (
  username: string,
): Promise<{ userExists: boolean; data: IFirebaseQueryResponse<IUser> } | false> => {
  const userExists = await FirebaseInstance.getSingleDocumentByParam<IUser>(
    'users',
    'username',
    username,
  );

  if (userExists) {
    return { userExists: !!userExists.result, data: userExists };
  }

  return false;
};

// If user is not found in DB, it throw an error (DocumentNotFoundError)
const checkIfUserExistsByDocId = async (userDocId: string) => {
  const userExists = await FirebaseInstance.getDocumentRef<IUser>('users', userDocId);
  return userExists;
};

export { checkIfUsernameExists, checkIfUserExistsByDocId };
