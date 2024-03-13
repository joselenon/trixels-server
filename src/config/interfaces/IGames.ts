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

export interface IRaffleInDb {
  createdAt: number;
  updatedAt: number;
  finishedAt?: number;
  type: 'raffles';
  info: {
    bets: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>[];
    ticketPrice: number;
    totalTickets: number;
    totalPrizesValue: number;
    privacy: {
      type: 'public' | 'private';
      mode: 'public' | 'guildMembers';
    };

    prizes: TRaffleWinnersPrizes;
    winnersBets?: {
      betRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
      hash: string;
    }[];
  };
}

export interface IRaffleToFrontEnd {
  gameId: string;
  createdAt: number;
  finishedAt?: number;
  type: 'raffles';
  info: {
    bets: IBetToFrontEnd[] /* DIFF */;
    ticketPrice: number;
    totalTickets: number;
    totalPrizesValue: number;
    privacy: {
      mode: 'public' | 'guildMembers';
      type: 'public' | 'private';
    };

    /* MUDADO PARA STRING (JSON) MOMENTANEAMENTE, DEVIDO A VARIABILIDADE DE QUANTIDADE DE PREMIOS - GRAPHQL */
    prizes: string;

    winnersBets?: {
      betRef: IBetToFrontEnd /* DIFF */;
      hash: string;
    }[];
  };
}
/*  */

/* RAFFLE CREATION INTERFACES */

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
  privacy: {
    mode: 'public' | 'guildMembers';
    type: 'public' | 'private';
  };
  prizes: TRaffleCreationPrizesWinners;
}
