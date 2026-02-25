import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.json";

export default defineConfig({
  plugins: [preact(), crx({ manifest })],
  build: {
    // 提升构建性能
    target: "esnext",
    minify: "esbuild",
  },
  // 如果需要使用 Rust WASM，未来可在此处添加 vite-plugin-wasm
});
