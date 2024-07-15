import { IBetToFrontEnd } from './IBet';

export interface IRafflesControllerGQL {
  getAllRaffles(): Promise<{
    activeRaffles: IRaffleToFrontEnd[];
    endedRaffles: IRaffleToFrontEnd[];
  }>;
}

export type TRafflePrizeX = { prizeId: string; quantity: number; totalValue: number };

export type TRaffleWinnerPrizes = {
  totalValue: number;
  info: { [prizeX: string]: TRafflePrizeX };
};

export type TRaffleWinnersPrizes = {
  [winnerX: string]: TRaffleWinnerPrizes;
};

export type TWinnerBetInRedis = {
  betRef: IBetToFrontEnd;
  hash: string;
  drawnNumber: number;
};
export type TWinnerBetsInRedis = TWinnerBetInRedis[];

export type TWinnerBetsInDb = {
  betRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
  hash: string;
  drawnNumber: number;
}[];

export interface IRaffleInDb {
  createdAt: number;
  createdBy: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
  updatedAt: number;
  status: 'active' | 'cancelled' | 'ended';
  finishedAt?: number;
  type: 'raffles';
  description: string;
  info: {
    bets: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>[];
    ticketPrice: number;
    totalTickets: number;
    ticketsBought: number;
    prizesTotalValue: number;
    privacy: {
      type: 'public' | 'private';
      mode: 'public' | 'guildMembers';
    };

    prizes: TRaffleWinnersPrizes;
    winnersBetsInfo?: TWinnerBetsInDb;
    maxTicketsPerUser?: number;
  };
}

// ! TIMESTAMPS ARE STRING BECAUSE OF GRAPHQL (ERRORS WITH BIG NUMBERS)
export interface IRaffleToFrontEnd {
  gameId: string;
  createdAt: string;
  createdBy: {
    avatar: string;
    username: string;
    userId: string;
  };
  status: 'active' | 'cancelled' | 'ended';
  finishedAt?: string;
  type: 'raffles';
  description: string;
  info: {
    bets: IBetToFrontEnd[];
    ticketPrice: number;
    totalTickets: number;
    ticketsBought: number;
    prizesTotalValue: number;
    privacy: {
      mode: 'public' | 'guildMembers';
      type: 'public' | 'private';
    };
    prizes: string /* MUDADO PARA STRING (JSON) MOMENTANEAMENTE, DEVIDO A VARIABILIDADE DE QUANTIDADE DE PREMIOS - GRAPHQL */;
    winnersBetsInfo?: TWinnerBetsInRedis;
    maxTicketsPerUser?: number;
  };
}

export interface IRafflesInRedis {
  activeRaffles: IRaffleToFrontEnd[];
  endedRaffles: IRaffleToFrontEnd[];
}
