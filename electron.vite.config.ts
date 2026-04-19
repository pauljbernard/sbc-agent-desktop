import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    root: "src/renderer",
    plugins: [react()],
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
