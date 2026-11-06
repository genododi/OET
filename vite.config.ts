import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execFileSync } from 'node:child_process'

// https://vite.dev/config/
export default defineConfig({
  base: '/OET/',
  plugins: [react()],
  define: { __OET_RELEASE_COMMIT__: JSON.stringify(execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()) },
})
