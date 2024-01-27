import { AuthError } from '../config/errors/classes/ClientErrors';
import { PSub, PUBSUB_EVENTS, TActionKeys, TPubSubEvents } from '../graphql/pubSubConfig';
import { TMessages, responseBody } from './responseHelpers';

function publishPSubEvent(triggerName: string, action: any) {
  return PSub.publish(triggerName, action);
}

function pSubEventHelper(
  event: TPubSubEvents,
  actionKey: TActionKeys,
  payload: { success: boolean; message: TMessages; data: any },
  userDocId?: string,
) {
  const action = {
    [actionKey]: responseBody(payload.success, payload.message, payload.data),
  };
  let triggerName = PUBSUB_EVENTS[event].triggerName;

  if (PUBSUB_EVENTS[event].private && !userDocId) throw new AuthError();

  if (PUBSUB_EVENTS[event].private) {
    triggerName = `${PUBSUB_EVENTS[event].triggerName}:${userDocId}`;
  }

  return publishPSubEvent(triggerName, action);
}

export default pSubEventHelper;
