import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import type { PluginOption } from "vite";

function fullReloadRendererPlugin(): PluginOption {
  return {
    name: "intentos-renderer-full-reload",
    handleHotUpdate({ file, server }) {
      if (file.includes("/src/renderer/src/")) {
        server.ws.send({
          type: "full-reload",
          path: "*",
          triggeredBy: file
        });
        return [];
      }
      return undefined;
    }
  };
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    root: "src/renderer",
    plugins: [react(), fullReloadRendererPlugin()],
    build: {
      outDir: resolve(__dirname, "dist/renderer")
    },
    resolve: {
      alias: {
        "@renderer": "/src",
        "@shared": "/../shared"
      }
    }
  }
});
