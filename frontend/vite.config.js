import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 开发环境用 Vite 代理把 /api 转发到 FastAPI，避免 CORS 和端口混搭
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
