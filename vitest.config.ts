import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['server/**/*.test.ts', 'shared/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '#auth-utils': resolve(__dirname, 'shared/types/auth.d.ts'),
    },
  },
})
