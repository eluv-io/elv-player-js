import { defineConfig } from "vite";
import path from "path";
import autoprefixer from "autoprefixer";
import react from "@vitejs/plugin-react-swc";

let plugins = [
  react()
];

export default defineConfig(() => {
  return {
    plugins,
    server: {
      port: 8089,
      host: true
    },
    build: {
      lib: {
        entry: path.resolve(__dirname, "lib/index.js"),
        name: "@eluvio/elv-player-js",
        fileName: (format) => `elv-player-js.${format}.js`,
        formats: ["es", "cjs"]
      },
      cssCodeSplit: false,
      manifest: true
    },
    css: {
      postcss: {
        plugins: [
          autoprefixer
        ]
      }
    }
  };
});
