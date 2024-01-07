/* eslint-disable @typescript-eslint/no-var-requires */

import { RedisInstance } from '..';
import gameLibItemsJSON from '../assets/gameLibItems.json';
import REDIS_KEYS from '../config/constants/REDIS_KEYS';
const ProgressBar = require('progress');

import { GameLibItemsProps } from '../config/interfaces/GameLibItemsProps';
import {
  ItemListingProps,
  ItemMarketData,
} from '../config/interfaces/ItemStatsComponentsProps';
import AxiosService from './AxiosService';
import UpdateHistoryPricesJSONService from './UpdateHistoryPricesJSONService';
import UpdateItemsListingsRedisService from './UpdateItemsListingsRedisService';

export default function UpdateItemsInfoService() {
  try {
    const gameLibItems: GameLibItemsProps = gameLibItemsJSON;
    const itemsNames = Object.keys(gameLibItems);

    const allItemsListings = <{ [itemName: string]: ItemMarketData }>{};

    const progressBar = new ProgressBar(
      'Loading Items: [:bar] :itemName :current/:total  :etas',
      {
        complete: '=',
        incomplete: ' ',
        width: 50,
        total: itemsNames.length,
      },
    );

    const itemFetch = async (itemName: string) => {
      const isRedisOn = await RedisInstance.isRedisClientOn();
      if (!isRedisOn || gameLibItems[itemName]?.trade?.disableTrading) return;

      const { data } = await AxiosService<ItemMarketData>({
        url: `https://pixels-server.pixels.xyz/v1/marketplace/item/${itemName}`,
        method: 'get',
      });

      if (data) {
        const { listings, ownerUsernames } = data;
        const listingsTreated = () => {
          listings.sort((l1, l2) => l1.price - l2.price);
          return listings.filter(
            (listing) => listing.currency === 'cur_berry',
          ) as ItemListingProps[];
        };

        allItemsListings[itemName] = {
          listings: listingsTreated(),
          ownerUsernames,
        };

        progressBar.tick({ itemName });
      } else {
        console.log(`Error fetching item: '${itemName} :('`);
      }
    };

    const allRequests = itemsNames.map((itemName) => {
      return itemFetch(itemName);
    });

    Promise.all(allRequests)
      .then(async () => {
        progressBar.terminate();
        await UpdateHistoryPricesJSONService.updateHistoryPrices(allItemsListings);
        await UpdateItemsListingsRedisService.setItemsListingsRedis(allItemsListings);
        await RedisInstance.set(REDIS_KEYS.lastItemsUpdate, new Date().getTime());

        console.log(`${new Date().toLocaleString()} - All items updated successfully!`);
      })
      .catch((error) => {
        console.error('Erro durante as requisições:', error);
      });
  } catch (err) {
    return err;
  }
}
