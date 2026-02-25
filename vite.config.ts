import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.json";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig({
  plugins: [preact(), crx({ manifest }), wasm(), topLevelAwait()],
  build: {
    // 提升构建性能
    target: "esnext",
    minify: "esbuild",
  },
});
