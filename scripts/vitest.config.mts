import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'scripts',
    root: __dirname,
    globals: true,
    environment: 'node',
    include: ['**/*.{test,spec}.{ts,mts}'],
    reporters: ['default'],
  },
});
