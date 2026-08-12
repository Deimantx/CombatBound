import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { uiInspectorSourcePlugin } from './vite.ui-inspector-source.ts'

export default defineConfig({
  plugins: [uiInspectorSourcePlugin(), react()],
})
