import { defineConfig } from 'vitest/config';

// ── Backend test runner ────────────────────────────────────────
// Vitest over Jest: native TypeScript (esbuild), zero ts-jest config,
// fast. Tests live next to the code they cover as *.test.ts.
//
// These are pure-unit tests — no database, no network. Anything that
// needs Prisma is mocked or simply not imported. `npm test` runs them
// all once; `npm run test:watch` re-runs on change.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Test env vars — the JWT util reads these at call time. Kept
    // obviously-fake so a real secret never has to live in the repo.
    env: {
      JWT_SECRET: 'test-jwt-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      JWT_EXPIRES_IN: '24h',
      JWT_REFRESH_EXPIRES_IN: '7d',
      NODE_ENV: 'test',
    },
  },
});
