import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Dev-only proxy for language APIs that don't send CORS headers:
  // LANGUAGE_PROXY_TARGET=http://localhost:9001 makes /language-proxy/spellcheck
  // forward to http://localhost:9001/spellcheck.
  const proxyTarget = env.LANGUAGE_PROXY_TARGET;

  return {
    server: {
      port: 8080,
      proxy: proxyTarget
        ? {
            "/language-proxy": {
              target: proxyTarget,
              changeOrigin: true,
              rewrite: (p) => p.replace(/^\/language-proxy/, ""),
            },
          }
        : undefined,
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
