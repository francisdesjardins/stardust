import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import pluginPrettier from 'eslint-plugin-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const sharedTsRules = {
  '@typescript-eslint/no-unused-vars': [
    'error',
    { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
  ],
  '@typescript-eslint/consistent-type-imports': [
    'error',
    { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
  ],
  '@typescript-eslint/no-misused-promises': [
    'error',
    {
      checksVoidReturn: {
        attributes: false,
        properties: false,
      },
    },
  ],
  '@typescript-eslint/no-floating-promises': 'error',
  '@typescript-eslint/await-thenable': 'error',
  '@typescript-eslint/no-invalid-void-type': 'off',
  eqeqeq: 'error',
  curly: ['error', 'all'],
};

const tsBase = [js.configs.recommended, ...tseslint.configs.strictTypeChecked];

const tsBaseScripts = [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked];

const reactPluginRules = {
  ...reactHooks.configs.recommended.rules,
};

export default defineConfig(
  // -------------------------------------------------------------------------
  // Ignores (global)
  // -------------------------------------------------------------------------
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/coverage/**',
      'benchmarks/results/**',
      'playground/dist/**',
      '**/.vite/**',
      '**/*.d.ts',
    ],
  },

  // -------------------------------------------------------------------------
  // Scope 1 — Packages source (browser runtime, React for react pkg)
  // -------------------------------------------------------------------------
  {
    extends: tsBase,
    files: ['packages/*/src/**/*.{ts,tsx}'],
    ignores: ['packages/solid/src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      globals: { ...globals.browser },
      parserOptions: {
        project: ['packages/core/tsconfig.json', 'packages/react/tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactPluginRules,
      ...sharedTsRules,
    },
  },

  // Solid package — no React hooks rules
  {
    extends: tsBase,
    files: ['packages/solid/src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      globals: { ...globals.browser },
      parserOptions: {
        project: ['packages/solid/tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      ...sharedTsRules,
    },
  },

  // -------------------------------------------------------------------------
  // Scope 2a — Playground React files
  // -------------------------------------------------------------------------
  {
    extends: tsBase,
    files: ['playground/src/**/*.{ts,tsx}'],
    ignores: ['playground/src/**/*.solid.tsx', 'playground/src/**/*.solid.ts'],
    languageOptions: {
      ecmaVersion: 2024,
      globals: { ...globals.browser },
      parserOptions: {
        project: ['playground/tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactPluginRules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      ...sharedTsRules,
    },
  },

  // -------------------------------------------------------------------------
  // Scope 2b — Playground SolidJS islands (no react-hooks)
  // -------------------------------------------------------------------------
  {
    extends: tsBase,
    files: ['playground/src/**/*.solid.tsx', 'playground/src/**/*.solid.ts'],
    languageOptions: {
      ecmaVersion: 2024,
      globals: { ...globals.browser },
      parserOptions: {
        project: ['playground/tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      ...sharedTsRules,
    },
  },

  // -------------------------------------------------------------------------
  // Scope 3 — Node scripts, benchmarks, vite configs
  // -------------------------------------------------------------------------
  {
    extends: tsBaseScripts,
    files: [
      'benchmarks/**/*.ts',
      'packages/*/vite.config*.ts',
      'packages/*/playwright.config.ts',
      'playground/vite.config.ts',
      'playground/vite-plugin-bench.ts',
      'packages/*/playwright.config.ts',
    ],
    languageOptions: {
      ecmaVersion: 2024,
      globals: { ...globals.node },
      parserOptions: {
        project: ['tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      ...sharedTsRules,
      'no-console': 'off',
    },
  },

  // -------------------------------------------------------------------------
  // Scope 4 — Tests overlay
  // -------------------------------------------------------------------------
  {
    files: ['**/*.ct.tsx', '**/*.test.ts', '**/*.story.tsx'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  // -------------------------------------------------------------------------
  // Prettier
  // -------------------------------------------------------------------------
  prettier,
  {
    plugins: { prettier: pluginPrettier },
    rules: {
      'prettier/prettier': 'error',
      curly: ['error', 'all'],
      'arrow-parens': ['error', 'always'],
    },
  }
);
