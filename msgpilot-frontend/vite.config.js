import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: parseInt(process.env.VITE_PORT) || 3000,
  },
});
