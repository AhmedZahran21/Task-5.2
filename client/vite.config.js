import { createHash } from 'node:crypto'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, isPreview }) => {
  const isDev = command === 'serve' && !isPreview
  // React Refresh injects this trusted inline preamble during development.
  // Allow its exact hash rather than enabling arbitrary inline scripts.
  const refreshHash = createHash('sha256')
    .update(react.preambleCode.replace('__BASE__', '/'))
    .digest('base64')
  const csp = [
    "default-src 'self'",
    `script-src 'self'${isDev ? ` 'sha256-${refreshHash}'` : ''}`,
    "script-src-attr 'none'",
    `style-src 'self'${isDev ? " 'unsafe-inline'" : ''}`,
    `connect-src 'self' http://localhost:4000${isDev ? ' ws://localhost:5175' : ''}`,
    "img-src 'self' https: data:",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'"
  ].join('; ')
  // API response headers do not protect the separate frontend document.
  const headers = { 'Content-Security-Policy': csp }

  return {
    plugins: [react()],
    server: {
      port: 5175,
      strictPort: true,
      headers
    },
    preview: { headers }
  }
})
