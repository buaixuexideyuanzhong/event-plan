import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 前端开发服务器：/api 代理到本地后端，保持同源、规避 CORS
export default defineConfig({
  plugins: [vue()],
  server: {
    host: '127.0.0.1',  // 强制 IPv4，避免 IPv6 权限问题
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
