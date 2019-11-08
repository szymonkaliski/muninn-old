const bodyParser = require("body-parser");
const chokidar = require("chokidar");
const createIO = require("socket.io");
const express = require("express");
const path = require("path");
const { createServer } = require("http");
const { debounce } = require("lodash");

const DEBOUNCE_TIME = 10;
const IS_DEV = process.env.NODE_ENV === "development";

module.exports = options => {
  const { dir, cache, port } = options;

  const app = express();
  const server = createServer(app);
  const io = createIO(server);

  // serve wiki assets
  app.use(bodyParser.urlencoded({ extended: false }));
  app.get("/asset/", (req, res) => {
    res.sendFile(req.query.path);
  });

  // frontend bundle
  if (IS_DEV) {
    const Bundler = require("parcel-bundler");

    const bundler = new Bundler(path.join(__dirname, "frontend/*.html"), {
      outDir: path.join(__dirname, "dist"),
      cacheDir: path.join(__dirname, ".cache")
    });

    app.use(bundler.middleware());
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
  }

  // update io clients on file changes
  const updateIO = debounce(() => {
    cache.parse();
    io.emit("data", { dir, files: cache.getFiles() });
  }, DEBOUNCE_TIME);

  chokidar.watch(dir, { ignored: /\.git.*/ }).on("all", () => {
    updateIO();
  });

  // update io clients when connecting
  io.on("connection", socket => {
    socket.emit("data", { dir, files: cache.getFiles() });
  });

  // start
  server.listen(port, () => {
    console.log(`muninn ui running on http://localhost:${port}`);
  });
};
