import { defineConfig } from '@playwright/test';

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
  ],
});
