export type TRaffleCreationPrizeX = { prizeId: string; quantity: number };

export type TRaffleCreationWinnerPrizes = {
  info: { [prizeX: string]: TRaffleCreationPrizeX };
};

export type TRaffleCreationPrizesWinners = {
  [winnerX: string]: TRaffleCreationWinnerPrizes;
};

export interface IRaffleCreationPayload {
  totalTickets: number;
  discountPercentage: number;
  description: string;
  privacy: {
    mode: 'public' | 'guildMembers';
    type: 'public' | 'private';
  };
  prizes: TRaffleCreationPrizesWinners;
  request: string;
  maxTicketsPerUser: number | null;
}
