import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import viteTsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [viteTsconfigPaths(), react()],
  test: {
    setupFiles: ['./vitest.setup.ts'],
    poolOptions: {
      vmThreads: {
        maxThreads: 1,
      }
    },
  }
})
