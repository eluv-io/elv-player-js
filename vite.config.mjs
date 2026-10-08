import { defineConfig } from "vite";
import path from "path";
import autoprefixer from "autoprefixer";
import react from "@vitejs/plugin-react-swc";

// only serve what the test page and the Cast receiver need, everything else gets a 404.
const servedPages = ["/", "/index.html", "/receiver/index.html"];
const servedPrefixes = ["/test/", "/lib/", "/node_modules/", "/@vite/", "/@id/", "/@react-refresh", "/__vite_ping"];

const restrictServedPaths = () => ({
  name: "restrict-served-paths",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const urlPath = (req.url || "").split("?")[0];

      if(servedPages.includes(urlPath) || servedPrefixes.some(prefix => urlPath.startsWith(prefix))) {
        return next();
      }

      res.statusCode = 404;
      res.end();
    });
  }
});

let plugins = [
  react(),
  restrictServedPaths()
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
