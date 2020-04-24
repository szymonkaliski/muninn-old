const LRU = require("lru-cache");
const envPaths = require("env-paths");
const fs = require("fs");
const glob = require("glob");
const mkdirp = require("mkdirp");
const path = require("path");

const { parseMarkdown } = require("../markdown");

const CACHE_PATH = envPaths("muninn").cache;
const CACHE_FILE = path.join(CACHE_PATH, "cache.json");

const createCache = () => {
  const cache = new LRU({
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  if (!fs.existsSync(CACHE_PATH)) {
    mkdirp(CACHE_PATH);
  }

  let cachedData;

  if (fs.existsSync(CACHE_FILE)) {
    try {
      cachedData = JSON.parse(fs.readFileSync(CACHE_FILE));
    } catch (e) {
      console.error(e);
    }
  }

  if (cachedData) {
    cache.load(cachedData);
  }

  const store = () => {
    const json = JSON.stringify(cache.dump());
    fs.writeFileSync(CACHE_FILE, json, { encoding: "utf-8" });
  };

  const clear = () => {
    if (fs.existsSync(CACHE_FILE)) {
      fs.unlinkSync(CACHE_FILE);
    }
  };

  return { cache, store, clear };
};

module.exports = (dir) => {
  const { cache, store, clear } = createCache();

  let needsStoring = false;
  let files = {};

  const parseFiles = (dir) => {
    const files = glob.sync("**/*.md", { cwd: dir });

    return files.reduce((memo, file) => {
      const fullPath = path.join(dir, file);
      const mtimeMs = fs.statSync(fullPath).mtimeMs;
      const cached = cache.get(fullPath) || {};

      let mdast, content;

      if (cached.mtimeMs !== mtimeMs) {
        content = fs.readFileSync(fullPath, { encoding: "utf-8" });
        mdast = parseMarkdown(content);

        cache.set(fullPath, { mtimeMs, mdast, content });
        needsStoring = true;
      } else {
        mdast = cached.mdast;
        content = cached.content;
      }

      memo[file] = { content, mdast };

      return memo;
    }, {});
  };

  const parse = () => {
    files = parseFiles(dir);
  };

  return {
    parse,
    store: () => needsStoring && store(),
    clear,

    getFiles: () => files, // not sure why just putting `files: files` here doesn't work
  };
};
