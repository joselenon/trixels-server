import { TRaffleCreationPrizesWinners, TRaffleCreationWinnerPrizes } from '../config/interfaces/IRaffleCreation';

/* Returns all prize items (of all the winners) */
function getAllPrizesItems(prizes: TRaffleCreationPrizesWinners) {
  const getItemsIdsFromPrizesOfWinner = (winnerXPrizes: TRaffleCreationWinnerPrizes): string[] => {
    const winnerXPrizesKeys = Object.keys(winnerXPrizes['info']);
    return winnerXPrizesKeys.map((prizeXKey) => {
      return winnerXPrizes['info'][prizeXKey].prizeId;
    });
  };

  /* [winner1, winner2, winner3] */
  const winnersKeys = Object.keys(prizes);

  const allPrizesArray: string[] = ([] as string[]).concat(
    ...winnersKeys.map((winnerXKey) => {
      const winnerXPrizes = prizes[winnerXKey];
      return getItemsIdsFromPrizesOfWinner(winnerXPrizes);
    }),
  );

  return allPrizesArray;
}

export { getAllPrizesItems };
