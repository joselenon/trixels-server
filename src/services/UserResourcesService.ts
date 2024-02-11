/* eslint-disable @typescript-eslint/no-var-requires */
import { NextFunction, Request, Response } from 'express';
import { responseBody } from '../helpers/responseHelpers';
import { InvalidPayloadError } from '../config/errors/classes/SystemErrors';
import { FirebaseInstance, RedisInstance } from '..';
import { AuthError, GenericError } from '../config/errors/classes/ClientErrors';
import {
  IResourceInfoCreationPayload,
  IUserResourceFirebase,
  IUserResourcesRedis,
} from '../config/interfaces/IUserResources';
import JWTService from '../services/JWTService';

class ManageResourcesController {
  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization;
      if (!token) throw new AuthError();

      const tokenValue = JWTService.validateJWT(token.split('Bearer ')[1]);
      /* const userId = tokenValue.userDocId; */
      const userId = '7ulTdNnojgJV0mAf52cP';

      const userInDb = await FirebaseInstance.getDocumentById('users', userId);

      if (!userInDb) throw new AuthError();

      const redisKey = `resources:${userId}`;
      const userRef = (await FirebaseInstance.getDocumentRef('users', userInDb.docId))
        .result;
      const userResourcesRedis = await RedisInstance.get<IUserResourcesRedis>(redisKey, {
        isJSON: true,
      });

      const getUserResourcesFromFirebase = async () => {
        const userResources =
          await FirebaseInstance.getManyDocumentsByParam<IUserResourceFirebase>(
            'usersResources',
            'userRef',
            userRef,
          );

        return userResources;
      };

      if (!userResourcesRedis) {
        const resourcesFromDb = await getUserResourcesFromFirebase();

        if (resourcesFromDb) {
          const redisObj: IUserResourcesRedis = {};

          resourcesFromDb.forEach((resourceDoc) => {
            const { landNumber, resourceName } = resourceDoc.result;

            redisObj[resourceDoc.docId as keyof IUserResourcesRedis] = {
              landNumber,
              resourceName,
            };
          });

          await RedisInstance.set(redisKey, redisObj);
          return res.status(200).json(responseBody(true, 'GET_MSG', redisObj));
        } else {
          return res.status(200).json(responseBody(true, 'GET_MSG', {}));
        }
      }

      return res.status(200).json(responseBody(true, 'GET_MSG', userResourcesRedis));
    } catch (err) {
      return next(err);
    }
  };

  put = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization;
      if (!token) throw new AuthError();

      const tokenValue = JWTService.validateJWT(token);
      /* const userId = tokenValue.userDocId; */
      const userId = '7ulTdNnojgJV0mAf52cP';

      const data = req.body as { startTime: number };
      const { resourceId } = req.query;

      if (!resourceId) throw new GenericError();

      const userResourcesRedis = await RedisInstance.get<IUserResourcesRedis>(
        `resources:${userId}`,
        {
          isJSON: true,
        },
      );

      if (userResourcesRedis && userResourcesRedis[resourceId as string]) {
        const selectedResource = userResourcesRedis[resourceId as string];
        const updatedResource = { ...selectedResource, ...data };

        await RedisInstance.set(
          `resources:${userId}`,
          { ...userResourcesRedis, [resourceId as string]: { ...updatedResource } },
          { isJSON: true },
        );
      }

      return res.status(200).json(responseBody(true, 'GENERIC_MSG', null));
    } catch (err) {
      next(err);
    }
  };

  post = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization;
      if (!token) throw new AuthError();

      const tokenValue = JWTService.validateJWT(token.split('Bearer ')[1]);
      const userId = tokenValue.userDocId;

      const userRef = (await FirebaseInstance.getDocumentRef('users', userId)).result;

      const data = req.body as { [resourceId: string]: IResourceInfoCreationPayload };

      if (
        data &&
        typeof data.resourceName === 'string' &&
        typeof data.landNumber === 'number' &&
        typeof data.startTime === 'number'
      ) {
        const { landNumber, resourceName, startTime } = data;

        /*         const resourceAlreadyExists = async () => {
          const sameResourcesNameInDb =
            await FirebaseInstance.getManyDocumentsByParam<IUserResourceFirebase>(
              'usersResources',
              'resourceName',
              resourceName,
            );
          if (sameResourcesNameInDb) {
            for (const resource of sameResourcesNameInDb) {
              if (resource.result.landNumber === landNumber) {
                return false;
              }
            }
            return true;
          } else {
            return true;
          }
        }; */

        const validateResourceInfo = async () => {
          if (landNumber > 5000) throw new InvalidPayloadError();
          /*           const alreadyExists = await resourceAlreadyExists(); */

          if (
            resourceName !== 'APIARY' &&
            resourceName !== 'COOP' &&
            resourceName !== 'MINE' &&
            resourceName !== 'SPECIAL_MINE' &&
            resourceName !== 'SLUGGER'
            /* alreadyExists */
          ) {
            throw new InvalidPayloadError();
          }

          if (typeof startTime !== 'number') throw new InvalidPayloadError();
        };

        const createResourceInFirebase = async () => {
          const resourceId = await FirebaseInstance.writeDocument('usersResources', {
            landNumber,
            resourceName,
            userRef,
          });

          return resourceId;
        };

        const createResourceInRedis = async (resourceId: string) => {
          const userResourcesAlreadyInRedis =
            await RedisInstance.get<IUserResourcesRedis>(`resources:${userId}`, {
              isJSON: true,
            });

          const newResource = { [resourceId]: { landNumber, resourceName, startTime } };

          const userResourcesUpdatedRedis = {
            ...userResourcesAlreadyInRedis,
            ...newResource,
          };

          await RedisInstance.set(`resources:${userId}`, userResourcesUpdatedRedis, {
            isJSON: true,
          });
        };

        validateResourceInfo();
        const resourceId = await createResourceInFirebase();
        await createResourceInRedis(resourceId);

        res.status(200).json(responseBody(true, 'GENERIC_MSG', null));
      } else {
        throw new InvalidPayloadError();
      }
    } catch (err) {
      next(err);
    }
  };
}

export default new ManageResourcesController();
