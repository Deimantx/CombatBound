import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { uiInspectorSourcePlugin } from './vite.ui-inspector-source.ts'

export default defineConfig({
  plugins: [uiInspectorSourcePlugin(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    // The authored perk-tree viewport test is CPU-heavy when Vitest workers run in parallel on Windows.
    testTimeout: 10000,
  },
})
