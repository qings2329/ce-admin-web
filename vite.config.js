import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// 管理后台前端独立工程（与 ce-frontend/ 用户前端物理隔离）。
// 开发服务器把 /api/admin 代理到 cmd/admin 服务（:8095），避免跨域。
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5174,
        proxy: {
            "/api/admin": { target: "http://localhost:8095", changeOrigin: true },
        },
    },
});
