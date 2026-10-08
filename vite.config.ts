/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative asset paths so the build works from GitHub Pages' /regex2dfa/ subpath.
  base: './',
  plugins: [react()],
  test: {
    // Algorithm tests are pure TypeScript, so the default Node environment is enough.
    include: ['src/**/*.test.ts'],
  },
});
