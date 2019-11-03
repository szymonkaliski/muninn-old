const Bundler = require("parcel-bundler");
const bodyParser = require("body-parser");
const chokidar = require("chokidar");
const createIO = require("socket.io");
const express = require("express");
const path = require("path");
const { createServer } = require("http");
const { debounce } = require("lodash");

const DEBOUNCE_TIME = 10;

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

  // bundle frontend
  const bundler = new Bundler(path.join(__dirname, "frontend/*.html"));
  app.use(bundler.middleware());

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
    console.log(`Running on http://localhost:${port}`);
  });
};
