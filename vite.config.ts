import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, isPreview }) => ({
  plugins: [react()],
  // GitHub Pages serves this repository beneath /toolsChatGPT/.
  // Production preview uses the same base path so E2E tests exercise deployment behavior.
  base: command === 'build' || isPreview === true ? '/toolsChatGPT/' : '/',
  server: {
    host: true,
  },
}));
