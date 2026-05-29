import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@store': path.resolve(__dirname, './src/store'),
      '@services': path.resolve(__dirname, './src/services'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
  server: {
    port: 3000,
headers: {
    'Content-Security-Policy': [
      "default-src 'self'",
      "img-src 'self' https://image.tmdb.org https://images.tmdb.org data: blob:",
      "media-src 'self' https://image.tmdb.org blob:",
      "connect-src 'self' https://*.execute-api.ap-south-1.amazonaws.com https://cognito-idp.ap-south-1.amazonaws.com https://*.auth.ap-south-1.amazoncognito.com wss://*.execute-api.ap-south-1.amazonaws.com",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "frame-src https://www.youtube.com",
    ].join('; '),
  },
  // Allow Codespaces to proxy correctly
  hmr: {
    clientPort: 443,
    protocol: 'wss',
  },
  allowedHosts: 'all',
  },
})