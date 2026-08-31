import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages serves this repository beneath /toolsChatGPT/.
  // Keep root paths during local dev and E2E testing.
  base: command === 'build' ? '/toolsChatGPT/' : '/',
  server: {
    host: true,
  },
}));
