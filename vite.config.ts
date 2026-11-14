/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { apiPlugin } from './server/api.ts';

// https://vite.dev/config/
export default defineConfig({
  // apiPlugin : API locale en mémoire (/api/todo, /ingest) — serveur de dev uniquement (ROADMAP §7, Ahmed).
  plugins: [react(), apiPlugin()],
  test: { environment: 'node', include: ['tests/**/*.test.ts', 'src/**/*.test.ts'] },
});
