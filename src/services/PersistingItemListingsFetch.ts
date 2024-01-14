import { ItemMarketData } from '../config/interfaces/ItemStatsComponentsProps';
import AxiosService from './AxiosService';

export const fetchItemListings = async (
  itemName: string,
): Promise<{ [itemName: string]: ItemMarketData }> => {
  console.log(itemName, '- Fetching!');

  const response = await AxiosService<ItemMarketData>({
    url: `https://pixels-server.pixels.xyz/v1/marketplace/item/${itemName}`,
  });
  const data = response.data as ItemMarketData;

  return { [itemName]: { ...data } };
};
