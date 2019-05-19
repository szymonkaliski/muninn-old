const gaze = require("gaze");
const createIO = require("socket.io");
const express = require("express");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { debounce, flatMap } = require("lodash");

const PATH = "/users/Szymon/Documents/Dropbox/Tasks/";
const PORT = 3000;
const IS_DEV = process.env.NODE_ENV !== "production";

const data = {};
const sockets = {};

const notify = debounce(() => {
  Object.values(sockets).forEach(socket => socket.emit("data", data));
}, 1);

gaze("**/*.md", { cwd: PATH }, (err, watcher) => {
  const handleChange = watchPath => {
    console.log("handleChange", watchPath);

    if (!watchPath.endsWith(".md")) {
      return;
    }

    watchPath = watchPath.replace(`${PATH}`, "").split("/");

    let dataPatch = data;
    let fullPath = [];

    watchPath.forEach((p, idx) => {
      fullPath.push(p);

      if (!dataPatch[p]) {
        dataPatch[p] = {
          id: p,
          fullPath: fullPath.join("/")
        };

        if (idx !== watchPath.length - 1) {
          dataPatch[p].children = {};
        }
      }

      if (idx === watchPath.length - 1) {
        dataPatch[p].content = fs.readFileSync(path.join(PATH, ...watchPath), {
          encoding: "utf-8"
        });

        dataPatch[p].name = p.replace(".md", "");
        dataPatch[p].update = Date.now();
      }

      dataPatch = dataPatch[p].children;
    });

    notify();
  };

  watcher.on("added", handleChange);
  watcher.on("changed", handleChange);

  // TODO
  // watcher.on("delete")

  flatMap(watcher.watched(), paths => paths).forEach(handleChange);
});

const app = express();

if (IS_DEV) {
  const Bundler = require("parcel-bundler");
  const bundler = new Bundler(path.join(__dirname, "frontend/index.html"));

  app.use(bundler.middleware());
}

const server = http.createServer(app);
const io = createIO(server);

io.on("connection", socket => {
  sockets[socket.id] = socket;

  socket.emit("data", data);

  socket.on("disconnect", () => {
    delete sockets[socket.id];
  });

  socket.on("update-content", update => {
    fs.writeFileSync(path.join(PATH, update.path), update.content, "utf-8");
  });
});

server.listen(PORT, () => {
  console.log(`Running http://localhost:${PORT}`);
});
