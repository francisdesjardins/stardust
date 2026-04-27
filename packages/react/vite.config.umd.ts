import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', { target: '19' }]],
      },
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'StardustReact',
      formats: ['umd'],
      fileName: () => 'stardust-react.umd.js',
    },
    rollupOptions: {
      external: (id) => {
        return (
          id === 'react' ||
          id === 'react-dom' ||
          id === 'react/jsx-runtime' ||
          id.startsWith('@stardust/core')
        );
      },
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'ReactJSXRuntime',
          '@stardust/core': 'StardustCore',
        },
        exports: 'named',
      },
    },
    outDir: 'dist/umd',
    sourcemap: false,
    target: 'es2024',
    minify: true,
  },
});
