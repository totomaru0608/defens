import { defineConfig } from 'vite';
import { attachKingdomMultiplayerServer } from './server/index.js';

export default defineConfig({
  plugins: [
    {
      name: 'kingdom-realtime-mp-server',
      configureServer(server) {
        if (server.httpServer) {
          attachKingdomMultiplayerServer(server.httpServer, server.middlewares);
        }
      },
    },
  ],
});
