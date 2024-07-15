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
        const { JWTService, jwtToken, UserController } = context;
        const { userDoc } = await JWTService.validateJWT({ token: jwtToken });

        const userData = await UserController.getUser(userDoc.docId);
        if (!userData) throw new DocumentNotFoundError();

        return responseBody({ success: true, type: 'GET_USER_INFO', message: 'GET_MSG', data: userData.docData });
      } catch (err) {
        validateAndCaptureError(err);
      }
    },

    getBalance: async (_: any, args: any, context: IGQLContext) => {
      try {
        const { JWTService, jwtToken } = context;
        const { userDoc } = await JWTService.validateJWT({ token: jwtToken });
        const userId = userDoc.docId;

        const balance = await BalanceService.getUserBalance(userId);

        await PubSubEventManager.publishEvent(
          'GET_LIVE_BALANCE',
          { success: true, type: 'GET_LIVE_BALANCE', message: 'GET_MSG', data: balance },
          userId,
        );

        return responseBody({ success: true, type: 'GET_BALANCE', message: 'GET_MSG', data: balance });
      } catch (err) {
        validateAndCaptureError(err);
      }
    },
  },

  Subscription: {
    getLiveBalance: {
      subscribe: async (_: any, args: any, context: IGQLContext) => {
        try {
          const { JWTService, jwtToken } = context;
          const { userDoc } = await JWTService.validateJWT({ token: jwtToken });

          return PubSubEventManager.getPSub().asyncIterator([
            `${PUBSUB_EVENTS.GET_LIVE_BALANCE.triggerName}:${userDoc.docId}`,
          ]);
        } catch (err) {
          validateAndCaptureError(err);
        }
      },
    },

    getLiveMessages: {
      subscribe: async (_: any, args: any, context: IGQLContext) => {
        try {
          const { JWTService, jwtToken } = context;
          const { userDoc } = await JWTService.validateJWT({ token: jwtToken });

          return PubSubEventManager.getPSub().asyncIterator([
            `${PUBSUB_EVENTS.GET_LIVE_MESSAGES.triggerName}:${userDoc.docId}`,
          ]);
        } catch (err) {
          validateAndCaptureError(err);
        }
      },
    },
  },
};

export default resolvers;
