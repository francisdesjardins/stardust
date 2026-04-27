import babel from '@rolldown/plugin-babel';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
const hashRouter = process.env['VITE_HASH_ROUTER'] === 'true';

export default defineConfig({
  base: hashRouter ? './' : '/',
  plugins: [
    // SolidJS: ONLY processes .solid.tsx / .solid.ts files
    solid({
      include: ['**/*.solid.tsx', '**/*.solid.ts'],
    }),
    // React: everything else (.tsx/.ts/.jsx/.js), excluding .solid.* files
    react({
      exclude: /\.solid\.(tsx|ts)$/,
    }),
    babel({
      include: /(?<!\.solid)\.(tsx|ts|jsx|js)$/,
      presets: [reactCompilerPreset()],
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      // Point at source for live-reload during dev — no prior build needed
      '@stardust/core': resolve(__dirname, '../packages/core/src/index.ts'),
      '@stardust/react': resolve(__dirname, '../packages/react/src/index.ts'),
      '@stardust/solid': resolve(__dirname, '../packages/solid/src/index.ts'),
    },
  },
  optimizeDeps: {
    include: ['solid-js', 'solid-js/web'],
  },
  server: {
    port: 3000,
    open: true,
    allowedHosts: ['.ngrok-free.app', '.ngrok.io'],
    fs: {
      strict: false,
      allow: ['..'],
    },
  },
  preview: {
    port: 3000,
    allowedHosts: ['.ngrok-free.app', '.ngrok.io'],
  },
  build: {
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return;
          }
          if (id.includes('@mui') || id.includes('@emotion')) {
            return 'vendor-mui';
          }
          if (
            id.includes('react-syntax-highlighter') ||
            id.includes('highlight.js') ||
            id.includes('refractor') ||
            id.includes('prismjs')
          ) {
            return 'vendor-syntax';
          }
          if (id.includes('@tanstack')) {
            return 'vendor-router';
          }
          if (id.includes('solid-js')) {
            return 'vendor-solid';
          }
          return 'vendor-react';
        },
      },
    },
  },
});
