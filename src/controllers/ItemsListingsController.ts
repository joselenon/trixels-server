/* eslint-disable @typescript-eslint/no-var-requires */
import { NextFunction, Request, Response } from 'express';
import { RedisInstance } from '..';
import { ItemListingProps } from '../config/interfaces/ItemStatsComponentsProps';
import { responseBody } from '../helpers/responseHelpers';
import { RedisError } from '../config/errors/classes/SystemErrors';
import UpdateItemsInfoService from '../services/UpdateItemsInfoService';

class ItemsListingsController {
  getFromRedis = async () => {
    try {
      const itemsListingsRedis = await RedisInstance.get<ItemListingProps[]>(
        'allItemsListings',
        { isJSON: true },
      );

      if (itemsListingsRedis) return itemsListingsRedis;
      throw new RedisError('Sem listings');
    } catch (err) {
      if (err instanceof RedisError) {
        await UpdateItemsInfoService();
        const itemsListingsRedis = await RedisInstance.get<ItemListingProps[]>(
          'allItemsListings',
          { isJSON: true },
        );

        return itemsListingsRedis;
      }
    }
  };

  get = async (_: Request, res: Response, next: NextFunction) => {
    try {
      const itemsListingsRedis = await this.getFromRedis();
      return res.status(200).json(responseBody(true, 'GET_MSG', itemsListingsRedis));
    } catch (err) {
      next(err);
    }
  };
}

export default new ItemsListingsController();
