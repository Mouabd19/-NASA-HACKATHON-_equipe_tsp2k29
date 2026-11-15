// Owner: Ahmed (B). Pre-bundles server/vercel/models.ts (models + inlined simulated JSON) for the Vercel function.
// Run by `npm run build:api`; output: server/vercel/dist/models.js (ESM, Node 22, git-ignored).
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  root: here('../..'),
  publicDir: false,
  logLevel: 'warn',
  build: {
    ssr: here('./models.ts'),
    outDir: here('./dist'),
    emptyOutDir: true,
    target: 'node22',
    minify: false,
    rolldownOptions: { output: { format: 'es', entryFileNames: 'models.js', codeSplitting: false } },
  },
  ssr: { noExternal: true },
});
