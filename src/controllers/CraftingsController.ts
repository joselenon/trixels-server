/* eslint-disable @typescript-eslint/no-var-requires */
import { NextFunction, Request, Response } from 'express';
import { RedisInstance } from '..';
import {
  ItemListingProps,
  ItemMarketData,
} from '../config/interfaces/ItemStatsComponentsProps';
import AxiosService from '../services/AxiosService';
import gameLibItemsJSON from '../assets/gameLibItems.json';
import { GameLibItemsProps } from '../config/interfaces/GameLibItemsProps';
import { responseBody } from '../helpers/responseHelpers';

class ItemsListingsController {
  setItemsListingsRedis = async () => {
    try {
      const allItemsListings = <any>{};
      const gameLibItems: GameLibItemsProps = gameLibItemsJSON;

      const itemFetch = async (itemName: string) => {
        if (gameLibItems[itemName]?.trade?.disableTrading) return;

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

          return (allItemsListings[itemName] = {
            listings: listingsTreated(),
            ownerUsernames,
          });
        } else {
          throw new Error('deu merda');
        }
      };

      const allRequests = itemsNames.map((itemName) => {
        return itemFetch(itemName);
      });

      Promise.all(allRequests)
        .then(async () => {
          const allItemsListingsJSON = JSON.stringify(allItemsListings);
          await RedisInstance.set('allItemsListings', allItemsListingsJSON, {
            isJSON: true,
          });

          return allItemsListings;
        })
        .catch((error) => {
          console.error('Erro durante as requisições:', error);
        });
    } catch (err) {
      return err;
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
