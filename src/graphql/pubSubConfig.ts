import { PubSub } from 'graphql-subscriptions';

const PSub = new PubSub();

export type TPubSubEvents =
  | 'GET_LIVE_BALANCE'
  | 'GET_REDIS_JACKPOT'
  | 'GET_LIVE_LAST_JACKPOTS';

export type TActionKeys = 'getLiveBalance' | 'getLiveJackpot' | 'getLiveLastJackpots';

const PUBSUB_EVENTS = {
  GET_LIVE_BALANCE: { private: true, triggerName: 'GET_LIVE_BALANCE' },
  GET_REDIS_JACKPOT: { private: false, triggerName: 'GET_REDIS_JACKPOT' },
  GET_LIVE_LAST_JACKPOTS: {
    private: false,
    triggerName: 'GET_LIVE_LAST_JACKPOTS',
  },
};

export { PSub, PUBSUB_EVENTS };
