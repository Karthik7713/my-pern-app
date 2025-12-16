/* eslint-env node */
/* Allow 'process' global in this Node-only config file */
/* global process */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Use PORT env if provided, otherwise default to 5173.
    // Allow auto-incrementing by default so local dev won't fail when 5173
    // is already in use. CI can enforce strict behavior by setting
    // VITE_STRICT_PORT=true in the environment.
    port: Number(process.env.PORT) || 5173,
    strictPort: process.env.VITE_STRICT_PORT === 'true' ? true : false,
  }
})
