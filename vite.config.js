import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/nfl-pickems-2026/',
  test: {
    environment: 'node',
  },
});
