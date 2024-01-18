const path = require("path");
const { defineConfig } = require("vite");
const autoprefixer = require("autoprefixer");

module.exports = defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, "lib/index.js"),
      name: "@eluvio/elv-player-js",
      fileName: (format) => `elv-player-js.${format}.js`
    }
  },
  css: {
    postcss: {
      plugins: [
        autoprefixer
      ],
    }
  }
});
