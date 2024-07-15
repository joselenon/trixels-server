import validateAndCaptureError from '../../../common/validateAndCaptureError';
import IGQLContext from '../../../config/interfaces/IGQLContext';
import { responseBody } from '../../../helpers/responseHelpers';
import PubSubEventManager, { PUBSUB_EVENTS } from '../../../services/PubSubEventManager';

const resolvers = {
  Query: {
    getRaffles: async (_: any, __: any, context: IGQLContext) => {
      try {
        const { RafflesControllerGQL } = context;

        const allRaffles = await RafflesControllerGQL.getAllRaffles();

        return responseBody({ success: true, type: 'GET_LIVE_RAFFLES', message: 'GET_MSG', data: allRaffles });
      } catch (err) {
        validateAndCaptureError(err);
      }
    },
  },

  Subscription: {
    getLiveRaffles: {
      subscribe: async (/* _: any, args: any, context: IGQLContext */) => {
        try {
          return PubSubEventManager.getPSub().asyncIterator([`${PUBSUB_EVENTS.GET_LIVE_RAFFLES.triggerName}`]);
        } catch (err) {
          validateAndCaptureError(err);
        }
      },
    },
  },
};

export default resolvers;
