export type TRaffleCreationItem = { itemId: string; quantity: number };

export type TRaffleCreationWinnerPrizes = {
  items: TRaffleCreationItem[];
};

export type TRaffleCreationItemsWinners = TRaffleCreationWinnerPrizes[];

export interface IRaffleCreationPayload {
  totalTickets: number;
  discountPercentage: number;
  description: string;
  privacy: {
    mode: 'public' | 'guildMembers';
    type: 'public' | 'private';
  };
  prizes: TRaffleCreationItemsWinners;
  request: string;
  maxTicketsPerUser: number | null;
}
