// Config to run before exception be computed in Sentry
import { Event } from '@sentry/node';

export default function sentryBeforeSendConfig(event: Event) {
  if (event.exception && event.exception.values) {
    console.log(
      'This is the event \n',
      `Type: ${event.exception?.values[0].type} \n Value: ${event.exception?.values[0].value}`,
    );

    const shouldFilter = event.exception.values.some((value) => {
      return (
        value.type?.includes('Client Error') ||
        /*         value.value?.includes(
          RESPONSE_CONFIG.ERROR.SYSTEM_ERROR_MSGS.NO_JACKPOT_IN_REDIS,
        ) || */
        value.type?.includes('EXAMPLE ERROR ADDED')
      );
    });
    if (shouldFilter) {
      return null;
    }
  }

  return event;
}
