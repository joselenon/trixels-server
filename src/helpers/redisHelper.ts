interface IRedisKeys {
  last_balance_att: string; // :userDocId
  active_jackpot: string;
  jackpot_bets_queue: string;
  last_jackpots: string; // :userDocId
  betsQueue: string;
  isBetsQueueProcessing: string;
  allRaffles: string;
  balanceUpdateQueue: string;
  walletVerification: string;
}

function getRedisKeyHelper(key: keyof IRedisKeys, value?: string) {
  if (value) return `${key}:${value}`;
  return `${key}`;
}

export default getRedisKeyHelper;
