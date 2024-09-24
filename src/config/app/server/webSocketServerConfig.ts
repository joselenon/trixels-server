import { Server } from 'http';
import URLS from '../../constants/URLS';

const webSocketServerConfig = (httpServer: Server) => {
  return {
    server: httpServer,
    path: URLS.ENDPOINTS.GRAPHQL,
  };
};

export default webSocketServerConfig;
