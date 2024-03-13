import validateAndCaptureError from '../../../common/validateAndCaptureError';
import IGQLContext from '../../../config/interfaces/IGQLContext';
import { responseBody } from '../../../helpers/responseHelpers';

const resolvers = {
  Query: {
    getRaffles: async (_: any, __: any, context: IGQLContext) => {
      try {
        const { RafflesControllerGQL } = context;

        const allRaffles = await RafflesControllerGQL.getAllRaffles();

        return responseBody(true, 'GET_MSG', allRaffles);
      } catch (err) {
        validateAndCaptureError(err);
      }
    },
  },
};

export default resolvers;
