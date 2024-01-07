export interface ItemListingProps {
  createdAt: number;
  currency: string;
  ownerId: string;
  price: number;
  quantity: number;
  _id: number;
  purchasedQuantity: number;
  claimedQuantity: number;
}

export type ItemListingKeys = keyof ItemListingProps;

export interface ItemMarketData {
  listings: ItemListingProps[];
  ownerUsernames: { [id: string]: string };
}

export type ItemHistoryPricesData = {
  [itemName: string]: Array<{ value: number; time: number }>;
};

export type ItemMetricsProps = {
  averagePrice1h: number;
  averagePrice1d: number;
  averagePrice7d: number;
  /*   pricesArray: number[];
  daysArray: number[]; */
};

export type MetricsProps = {
  averages: {
    averagePrice1h: { caption: string; metricValue: number };
    averagePrice1d: { caption: string; metricValue: number };
    averagePrice7d: { caption: string; metricValue: number };
  };
  cheapestListing: ItemListingProps;
};

export type ItemProp = {
  [itemName: string]: {
    image: string;
    metrics: MetricsProps;
    market: ItemMarketData;
  };
};

export interface ItemStatsProps {
  itemName: string;
  showMetrics?: Array<keyof ItemMetricsProps>;
  /*   setAllItemsMetrics?: Dispatch<SetStateAction<AllPricesProps | undefined>>;*/
}

export interface ItemInfoProps extends MetricsProps {
  itemName: string;
}
