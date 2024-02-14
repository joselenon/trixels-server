/* eslint-disable @typescript-eslint/no-var-requires */
import { UnknownError } from '../config/errors/classes/SystemErrors';
import { FirebaseInstance, RedisInstance } from '..';
import { AuthError } from '../config/errors/classes/ClientErrors';
import {
  IUserResourceFirebase,
  IUserResourceFrontEnd,
  IUserResourceResponse,
  IUsersResourcesRedis,
} from '../config/interfaces/IResources';
import { IUser } from '../config/interfaces/IUser';

const redisResourcesKey = `resources`;

class UserResourcesService {
  initialize = async () => {
    await RedisInstance.set(redisResourcesKey, { initial: [] }, { isJSON: true });
  };

  createUserResourcesRegistryInRedis = async (
    userRef: FirebaseFirestore.DocumentReference<
      FirebaseFirestore.DocumentData,
      FirebaseFirestore.DocumentData
    >,
    username: string,
  ) => {
    const usersResourcesRedis = await RedisInstance.get<IUsersResourcesRedis>(
      redisResourcesKey,
      { isJSON: true },
    );

    const getUserResourcesFromFirebase = async () => {
      const userResources =
        await FirebaseInstance.getSingleDocumentByParam<IUserResourceFirebase>(
          'usersResources',
          'userRef',
          userRef,
        );

      return userResources;
    };

    const userResourcesFromDb = await getUserResourcesFromFirebase();
    const userResources = userResourcesFromDb?.result.resources;

    if (userResources && userResources.length > 0) {
      const userResourcesFiltered: IUserResourceFrontEnd[] = userResources.filter(
        (resource) => {
          if (resource.account && resource.landNumber && resource.resourceType) {
            return resource;
          }
        },
      );

      const updateObj: IUsersResourcesRedis = {
        ...usersResourcesRedis,
        [username]: userResourcesFiltered,
      };

      await RedisInstance.set(redisResourcesKey, updateObj, { isJSON: true });

      return userResources;
    } else {
      return [];
    }
  };

  getUserResources = async (userDocId: string): Promise<IUserResourceFrontEnd[]> => {
    const userRefData = await FirebaseInstance.getDocumentRef<IUser>('users', userDocId);
    if (!userRefData.docData) throw new AuthError();

    const userRef = userRefData.result;
    const username = userRefData.docData.username;

    const usersResourcesRedis = await RedisInstance.get<IUsersResourcesRedis>(
      redisResourcesKey,
      { isJSON: true },
    );

    if (!usersResourcesRedis) {
      throw new UnknownError("userResourcesService didn't initialize");
    }

    if (!usersResourcesRedis[username]) {
      await this.createUserResourcesRegistryInRedis(userRef, username);
      return [];
    }

    return usersResourcesRedis[username];
  };

  updateUserResource = async (
    username: string,
    payload: IUserResourceFrontEnd,
  ): Promise<IUserResourceResponse> => {
    const usersResourcesRedis = await RedisInstance.get<IUsersResourcesRedis>(
      redisResourcesKey,
      { isJSON: true },
    );

    if (!usersResourcesRedis) {
      throw new UnknownError("userResourcesService didn't initialize");
    }

    if (!usersResourcesRedis[username]) {
      throw new UnknownError('user noT IN RESOURCES REDIS');
    }

    const userResources = usersResourcesRedis[username];

    const { landNumber, resourceType, account } = payload;
    const findResource = () => {
      const resourceFound = userResources.filter(
        (resource) =>
          resource.landNumber === landNumber &&
          resource.resourceType === resourceType &&
          resource.account === account,
      );
      if (resourceFound.length <= 0) throw new UnknownError('RESOURCE NOT FOUND');

      return resourceFound[0];
    };

    const resourceToUpdate = findResource();
    const updatedResource = { ...resourceToUpdate, ...payload };

    const userResourcesWithoutUpdatedResource = userResources.filter((resource) => {
      if (
        resource.account === account &&
        resource.landNumber === landNumber &&
        resource.resourceType === resourceType
      ) {
        return false;
      }

      return true;
    });

    const userResourcesToUpdate = [
      ...userResourcesWithoutUpdatedResource,
      updatedResource,
    ];

    await RedisInstance.set(
      redisResourcesKey,
      { ...usersResourcesRedis, [username]: userResourcesToUpdate },
      { isJSON: true },
    );

    return { [username]: { ...userResources, ...updatedResource } };
  };

  creatUserResource = async (
    userDocId: string,
    username: string,
    payload: IUserResourceFrontEnd,
  ) => {
    const usersResources =
      await RedisInstance.get<IUsersResourcesRedis>(redisResourcesKey);
    const userResources = await this.getUserResources(userDocId);

    const userRef = await FirebaseInstance.getDocumentRef('users', userDocId);

    const userResourcesDocId = await FirebaseInstance.getSingleDocumentByParam(
      'usersResources',
      'userRef',
      userRef.result,
    );

    if (!userResourcesDocId) throw new UnknownError('userResourcesDocId not ofund.');

    const { account, landNumber, resourceType, startTime } = payload;

    userResources.forEach((resource) => {
      if (
        resource.account === account &&
        resource.landNumber === landNumber &&
        resource.resourceType === resourceType
      )
        throw new UnknownError('Resource already exists');
    });

    const addNewResourceInDb = async () => {
      await FirebaseInstance.pushValueToKey(
        'usersResources',
        userResourcesDocId.docId,
        'resources',
        { account, landNumber, resourceType },
      );
    };

    const addNewResourceInRedis = async () => {
      const userResourcesToUpdate = [
        ...userResources,
        { account, landNumber, resourceType, startTime },
      ];

      const usersResourcesToUpdate = {
        ...usersResources,
        [username]: userResourcesToUpdate,
      };

      await RedisInstance.set(redisResourcesKey, usersResourcesToUpdate, {
        isJSON: true,
      });
    };

    addNewResourceInDb();
    addNewResourceInRedis();
  };
}

export default new UserResourcesService();
