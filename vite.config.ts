import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { loadEnv } from "vite";
import { footballApiPlugin } from "./server/vite-plugin.mjs";

export default defineConfig(({ mode }) => {
  const serverEnv = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [
      footballApiPlugin(serverEnv),
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["icon.svg", "apple-touch-icon.svg"],
        manifest: {
          name: "Full Time — Global Football",
          short_name: "Full Time",
          description: "Fixtures, tables, brackets and scorers from football's biggest competitions.",
          theme_color: "#07130f",
          background_color: "#07130f",
          display: "standalone",
          orientation: "portrait-primary",
          start_url: "/",
          icons: [
            { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" },
            { src: "/apple-touch-icon.svg", sizes: "180x180", type: "image/svg+xml" }
          ]
        },
        workbox: {
          cacheId: "full-time",
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [/^\/api\//],
          globPatterns: ["**/*.{js,css,html,svg,woff2}"],
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "full-time-football-data",
                expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 7 }
              }
            }
          ]
        }
      }),
    ],
    test: {
      environment: "jsdom",
      exclude: [...configDefaults.exclude, "tmp/**"],
      setupFiles: "./src/test/setup.ts",
      css: true,
    },
    build: {
      sourcemap: true,
    },
  };
});
