/// <reference types="vitest" />
import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'build'],
    testTimeout: 10000, // matches the 10s timeout in your existing test
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'build/', 'src/**/*.{test,spec}.{js,ts}'],
    },
    typecheck: {
      tsconfig: 'tsconfig.json',
    },
  },
});
