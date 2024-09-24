import { Server } from 'http';
import URLS from '../../constants/URLS';

const webSocketServerConfig = (httpServer: Server) => {
  console.log('httpServer', httpServer);
  return {
    server: httpServer,
    path: URLS.ENDPOINTS.GRAPHQL,
  };
};

export default webSocketServerConfig;
