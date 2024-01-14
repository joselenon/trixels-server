import { FirebaseInstance, RedisInstance } from '..';
import * as Sentry from '@sentry/node';
import {
  IUserResourceFirebase,
  IUserResourceFrontEnd,
  IUserResourcesRedis,
} from '../config/interfaces/IUserResources';

class UsersResourcesStartTimeService {
  initiateService = async () => {
    try {
      const usersResources =
        await FirebaseInstance.getAllDocumentsByCollection<IUserResourceFirebase>(
          'usersResources',
        );

      if (usersResources?.result) {
        for (const resource of usersResources.result) {
          const userId = resource.docData.userRef.id;
          const { landNumber, resourceName } = resource.docData;

          const userInRedis = await RedisInstance.get<IUserResourcesRedis>(
            `resources:${userId}`,
            {
              isJSON: true,
            },
          );

          await RedisInstance.set(
            `resources:${userId}`,
            { ...userInRedis, [resource.docId]: { landNumber, resourceName } },
            {
              isJSON: true,
            },
          );
        }
      }
    } catch (err) {
      Sentry.captureException(err);
      return console.log('Something went wrong with "usersResourcesStartTime" service .');
    }
  };

  async addUserResource(userId: string, newResource: IUserResourceFrontEnd) {
    const userResourcesRedis = await RedisInstance.get<IUserResourcesRedis>(
      `resources:${userId}`,
      {
        isJSON: true,
      },
    );

    if (!userResourcesRedis) {
      return await RedisInstance.set(`resources:${userId}`, newResource);
    }

    const updatedResources = { ...userResourcesRedis, newResource };
    return await RedisInstance.set(`resources:${userId}`, updatedResources);
  }
}

export default new UsersResourcesStartTimeService();
