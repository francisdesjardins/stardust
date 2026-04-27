import { defineConfig, devices } from '@playwright/experimental-ct-react';
import babelPlugin from '@rolldown/plugin-babel';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  testDir: './src',
  timeout: 10_000,
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  projects: [
    {
      name: 'unit',
      testMatch: ['**/__tests__/**/*.test.ts'],
    },
    {
      name: 'component',
      testMatch: ['**/__tests__/**/*.ct.tsx'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  use: {
    ctViteConfig: {
      resolve: {
        alias: {
          '@stardust/core': resolve(__dirname, '../core/src/index.ts'),
        },
      },
      // Cast required: project uses Vite 8; experimental-ct-core bundles Vite 6 — Plugin types are structurally incompatible.
      plugins: [
        react({
          babel: {
            plugins: [['babel-plugin-react-compiler', { target: '19' }]],
          },
        }),
      ],
    },
  },
});
