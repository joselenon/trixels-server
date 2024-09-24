import {
  TRaffleCreationItemsWinners,
  TRaffleCreationWinnerPrizes,
} from '../config/interfaces/RaffleInterfaces/IRaffleCreation';

/* Returns all prize items (of all the winners) */
function getAllPrizesItems(prizes: TRaffleCreationItemsWinners) {
  const getItemsIdsFromPrizesOfWinner = (winnerXPrizes: TRaffleCreationWinnerPrizes): string[] => {
    return winnerXPrizes.items.map((prizeXKey) => {
      return prizeXKey.itemId;
    });
  };

  const allPrizesArray: string[] = ([] as string[]).concat(
    ...prizes.map((_, winnerIndex) => {
      const winnerPrize = prizes[winnerIndex];
      return getItemsIdsFromPrizesOfWinner(winnerPrize);
    }),
  );

  return allPrizesArray;
}

export { getAllPrizesItems };
