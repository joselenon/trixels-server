// Plugin to close connections or any other needed task before server closure

import { Disposable } from 'graphql-ws';

export default function serverWillStartPlugin(fn: Disposable) {
  return {
    serverWillStart: async () => ({
      drainServer: async () => {
        await fn.dispose();
      },
    }),
  };
}
