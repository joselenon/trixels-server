import { Server } from 'http';

const webSocketServerConfig = (httpServer: Server) => {
  return {
    server: httpServer,
    path: '/api/graphql',
  };
};

export default webSocketServerConfig;
