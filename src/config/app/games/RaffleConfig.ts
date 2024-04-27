/* Multiplicar preropllscreentime pela quantidade de vencedores que tiver */
const WheelAnimationTime = 4000;
const TimerTime = 10000;
const TotalTimeToRoll = WheelAnimationTime + TimerTime;

/* Function to check if raffle is completely finished (even the animation) */
export interface IRaffleAnimationAlreadyEndedFn {
  alreadyEnded: boolean;
  timeLeft: number | undefined;
}
const raffleAnimationAlreadyEndedFn = (finishedAt: number | undefined): IRaffleAnimationAlreadyEndedFn => {
  if (finishedAt) {
    const nowTime = new Date().getTime();
    const diff = finishedAt + TotalTimeToRoll - nowTime;

    return { alreadyEnded: diff < 0, timeLeft: diff };
  }

  return { alreadyEnded: false, timeLeft: undefined };
};

export { raffleAnimationAlreadyEndedFn, TimerTime, TotalTimeToRoll, WheelAnimationTime };
