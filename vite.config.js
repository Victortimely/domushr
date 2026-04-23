import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'robots.txt', 'sitemap.xml'],
            manifest: {
                name: 'DomusHR — Aplikasi Survey & Vetting Karyawan',
                short_name: 'DomusHR',
                description: 'DomusHR - Platform survey dan vetting karyawan berbasis web',
                theme_color: '#0f172a',
                background_color: '#0f172a',
                display: 'standalone',
                orientation: 'portrait',
                start_url: '/',
                icons: [
                    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
                    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
                    },
                    {
                        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: { cacheName: 'gstatic-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
                    },
                ],
            },
        }),
    ],
    build: {
        // Target modern browsers for smaller output
        target: 'es2020',
        // Manual chunk splitting for better long-term caching
        rollupOptions: {
            output: {
                manualChunks(id) {
                    // Core React vendor (rarely changes)
                    if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router')) {
                        return 'vendor-react';
                    }
                    // Heavy map library (d3 dependency tree is large)
                    if (id.includes('node_modules/react-simple-maps') || id.includes('node_modules/d3-')) {
                        return 'vendor-maps';
                    }
                    // PDF generation (only used on-demand)
                    if (id.includes('node_modules/jspdf')) {
                        return 'vendor-pdf';
                    }
                },
            },
        },
        // Enable CSS code splitting
        cssCodeSplit: true,
    },
})

