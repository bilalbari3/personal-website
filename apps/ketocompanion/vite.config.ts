import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the built app works from any sub-path (e.g. GitHub Pages /ketocompanion/).
// `--mode site` builds the public demo into the Hugo site's static folder, served by Netlify at
// https://bilalbari.com/ketocompanion-demo/. The absolute base keeps assets working whether or not
// the URL has a trailing slash.
// `--mode artifact` produces one JS and one CSS file that scripts/build-artifact.mjs inlines
// into a single self-contained page for claude.ai.
export default defineConfig(({ mode }) => ({
  base: mode === 'site' ? '/ketocompanion-demo/' : './',
  plugins: [react()],
  define: mode === 'artifact' ? { 'import.meta.env.VITE_ARTIFACT': JSON.stringify('1') } : {},
  build:
    mode === 'artifact'
      ? {
          outDir: 'dist-artifact',
          chunkSizeWarningLimit: 1000,
          cssCodeSplit: false,
          modulePreload: false,
          rollupOptions: { output: { inlineDynamicImports: true } },
        }
      : {
          ...(mode === 'site' && { outDir: '../../static/ketocompanion-demo', emptyOutDir: true }),
          // Recharts (with its React/D3 deps) is one ~550 kB vendor chunk; that's expected for this demo.
          chunkSizeWarningLimit: 650,
          rollupOptions: {
            output: {
              manualChunks: { charts: ['recharts'] },
            },
          },
        },
}));
