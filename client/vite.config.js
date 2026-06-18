import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const rglIndex = require.resolve('react-grid-layout');
const rglRoot = path.dirname(path.dirname(rglIndex));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      // Force CJS build — ESM (index.mjs) is missing WidthProvider in react-grid-layout v2.x
      // Regex: only match exact 'react-grid-layout', NOT subpaths like 'react-grid-layout/css/...'
      {
        find: /^react-grid-layout$/,
        replacement: rglIndex,
      },
      // CSS files are not in the package.json exports — point to actual files
      {
        find: 'react-grid-layout/css/styles.css',
        replacement: path.resolve(rglRoot, 'css/styles.css'),
      },
      {
        find: 'react-grid-layout/css/resizable.css',
        replacement: path.resolve(rglRoot, 'css/styles.css'),
      },
    ],
  },
  optimizeDeps: {
    include: ['react-grid-layout'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
