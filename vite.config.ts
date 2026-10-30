import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages 项目站点部署时通过 BASE_PATH=/仓库名/ 覆盖；本地开发保持 '/'
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  build: {
    target: 'es2022',
    // VexFlow 体积较大，单独拆包，首屏只加载界面
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('vexflow')) return 'vexflow';
          if (id.includes('tonal')) return 'theory';
          return undefined;
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Harmony 乐理',
        short_name: 'Harmony',
        description: '音阶与和弦的构成、听辨训练',
        lang: 'zh-CN',
        theme_color: '#f4f2ee',
        background_color: '#f4f2ee',
        display: 'standalone',
        orientation: 'any',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // 钢琴采样后续接入时需要把音频一起预缓存
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: 'index.html',
      },
    }),
  ],
});
