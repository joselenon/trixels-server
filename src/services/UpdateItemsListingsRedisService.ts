import { RedisInstance } from '..';
import {
  ItemListingProps,
  ItemMarketData,
} from '../config/interfaces/ItemStatsComponentsProps';
import { RedisError } from '../config/errors/classes/SystemErrors';

class UpdateItemsListingsRedisService {
  setItemsListingsRedis = async (allItemsListings: {
    [itemName: string]: ItemMarketData;
  }) => {
    try {
      const allItemsListingsJSON = JSON.stringify(allItemsListings);
      await RedisInstance.set('allItemsListings', allItemsListingsJSON, {
        inJSON: true,
      });

      return allItemsListings;
    } catch (err) {
      return err;
    }
  };

  getFromRedis = async () => {
    const itemsListingsRedis = await RedisInstance.get<ItemListingProps[]>(
      'allItemsListings',
      { inJSON: true },
    );

    if (itemsListingsRedis) return itemsListingsRedis;
    throw new RedisError('Listings not found.');
  };
}

export default new UpdateItemsListingsRedisService();
