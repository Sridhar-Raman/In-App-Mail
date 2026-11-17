import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// /api is proxied to the Express server so the httpOnly auth cookie stays same-origin.
const api = { '/api': { target: 'http://localhost:5000', changeOrigin: true } };

export default defineConfig({
    plugins: [react()],
    server: { port: 5173, proxy: api },
    preview: { proxy: api },
});
