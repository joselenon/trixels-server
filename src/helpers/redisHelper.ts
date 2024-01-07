interface IRedisKeys {
  ytb_last_videos: string; // :channel name (Saullo)
  last_balance_att: string; // :userDocId
  active_jackpot: string;
  jackpot_bets_queue: string;
  last_jackpots: string; // :userDocId
}

function getRedisKeyHelper(key: keyof IRedisKeys, value?: string) {
  if (value) return `${key}:${value}`;
  return `${key}`;
}

export default getRedisKeyHelper;
