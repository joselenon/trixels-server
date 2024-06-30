import { responseBody } from '../../../helpers/responseHelpers';
import IGQLContext from '../../../config/interfaces/IGQLContext';
import validateAndCaptureError from '../../../common/validateAndCaptureError';

import BalanceService from '../../../services/BalanceService';
import { DocumentNotFoundError } from '../../../config/errors/classes/SystemErrors';
import PubSubEventManager, { PUBSUB_EVENTS } from '../../../services/PubSubEventManager';

const resolvers = {
  Query: {
    getUser: async (_: any, __: any, context: IGQLContext) => {
      try {
        const { validateAuth, jwtToken, UserController } = context;
        const { jwtPayload } = await validateAuth(jwtToken);

        const userData = await UserController.getUser(jwtPayload.userDocId);
        if (!userData) throw new DocumentNotFoundError();

        return responseBody(true, 'GET_USER_INFO', 'GET_MSG', userData.docData);
      } catch (err) {
        validateAndCaptureError(err);
      }
    },

    getBalance: async (_: any, args: any, context: IGQLContext) => {
      try {
        const { validateAuth, jwtToken } = context;
        const { jwtPayload } = await validateAuth(jwtToken);

        const balance = await BalanceService.getUserBalance(jwtPayload.userDocId);

        await PubSubEventManager.publishEvent(
          'GET_LIVE_BALANCE',
          { success: true, type: 'GET_LIVE_BALANCE', message: 'GET_MSG', data: balance },
          jwtPayload.userDocId,
        );

        return responseBody(true, 'GET_BALANCE', 'GET_MSG', balance);
      } catch (err) {
        validateAndCaptureError(err);
      }
    },
  },

  Subscription: {
    getLiveBalance: {
      subscribe: async (_: any, args: any, context: IGQLContext) => {
        try {
          const { validateAuth, jwtToken } = context;
          const { jwtPayload } = await validateAuth(jwtToken);

          return PubSubEventManager.getPSub().asyncIterator([
            `${PUBSUB_EVENTS.GET_LIVE_BALANCE.triggerName}:${jwtPayload.userDocId}`,
          ]);
        } catch (err) {
          validateAndCaptureError(err);
        }
      },
    },

    getLiveMessages: {
      subscribe: async (_: any, args: any, context: IGQLContext) => {
        try {
          const { validateAuth, jwtToken } = context;
          const { jwtPayload } = await validateAuth(jwtToken);

          return PubSubEventManager.getPSub().asyncIterator([
            `${PUBSUB_EVENTS.GET_LIVE_MESSAGES.triggerName}:${jwtPayload.userDocId}`,
          ]);
        } catch (err) {
          validateAndCaptureError(err);
        }
      },
    },
  },
};

export default resolvers;
