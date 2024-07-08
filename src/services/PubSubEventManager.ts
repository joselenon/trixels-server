import { AuthError } from '../config/errors/classes/ClientErrors';
import { TMessages, responseBody } from '../helpers/responseHelpers';
import { PubSub } from 'graphql-subscriptions';

type TPubSubEvents = 'GET_LIVE_BALANCE' | 'GET_LIVE_RAFFLES' | 'GET_LIVE_MESSAGES';
/* type TActionKeys = 'getLiveBalance' | 'getLiveRaffles' | 'getLiveMessages'; */

export const PUBSUB_EVENTS = {
  GET_LIVE_BALANCE: { private: true, triggerName: 'GET_LIVE_BALANCE', actionKey: 'getLiveBalance' },
  GET_LIVE_RAFFLES: { private: false, triggerName: 'GET_LIVE_RAFFLES', actionKey: 'getLiveRaffles' },
  GET_LIVE_MESSAGES: { private: true, triggerName: 'GET_LIVE_MESSAGES', actionKey: 'getLiveMessages' },
};

export type TGQLResponsesTypes =
  | 'CREATE_RAFFLE'
  | 'GET_LIVE_RAFFLES'
  | 'GET_LIVE_BALANCE'
  | 'GET_AVAILABLE_ITEMS'
  | 'BUY_RAFFLE_TICKET'
  | 'REGISTER_USER'
  | 'LOG_USER'
  | 'GET_USER_INFO'
  | 'UPDATE_USER_CREDENTIALS'
  | 'GET_BALANCE'
  | 'GET_USER_TRANSACTIONS'
  | 'REDEEM_CODE'
  | 'REFRESH_ACCESS_TOKEN'
  | 'WALLET_VERIFICATION'
  | 'GET_DEPOSIT_METHODS';

interface IPubSubEventPayload<D> {
  success: boolean;
  type: TGQLResponsesTypes;
  message: TMessages;
  data?: D;
}

export interface IPubSubCreateRaffleData {
  gameId: string;
}

class PubSubEventManager {
  private static PSub = new PubSub();

  private static publishPSubEvent(triggerName: string, action: any) {
    return this.PSub.publish(triggerName, action);
  }

  static getPSub() {
    return this.PSub;
  }

  static async publishEvent<D>(event: TPubSubEvents, payload: IPubSubEventPayload<D>, userDocId?: string) {
    const { private: isPrivate, triggerName, actionKey } = PUBSUB_EVENTS[event];

    if (isPrivate && !userDocId) {
      throw new AuthError();
    }

    const formattedTriggerName = isPrivate ? `${triggerName}:${userDocId}` : triggerName;

    const action = {
      [actionKey]: responseBody(payload.success, payload.type, payload.message, payload.data),
    };

    await this.publishPSubEvent(formattedTriggerName, action);
  }
}

export default PubSubEventManager;
