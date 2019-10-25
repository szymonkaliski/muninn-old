const LRU = require("lru-cache");
const envPaths = require("env-paths");
const fs = require("fs");
const glob = require("glob");
const md5 = require("md5");
const path = require("path");

const { parseMarkdown, withoutParents } = require("../markdown");

const CACHE_PATH = envPaths("muninn").cache;
const CACHE_FILE = path.join(CACHE_PATH, "cache.json");

module.exports = dir => {
  dir = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);

  const cache = new LRU({
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  if (!fs.existsSync(CACHE_PATH)) {
    mkdirp(CACHE_PATH);
  }

  if (fs.existsSync(CACHE_FILE)) {
    try {
      const data = require(CACHE_FILE);
      cache.load(data);
    } catch (e) {
      console.error(e);
    }
  }

  const storeCache = () => {
    const data = cache.dump().map(d => ({
      ...d,
      v: withoutParents(d.v)
    }));

    const json = JSON.stringify(data);
    fs.writeFileSync(CACHE_FILE, json, { encoding: "utf-8" });
  };

  const parseFiles = dir => {
    const files = glob.sync("**/*.md", { cwd: dir });

    return files.reduce((memo, file) => {
      const fullPath = path.join(dir, file);
      const content = fs.readFileSync(fullPath, { encoding: "utf-8" });
      const hash = md5(content);

      let mdast = cache.get(hash);

      if (!mdast) {
        mdast = parseMarkdown(content);
        cache.set(hash, mdast);
      }

      return { ...memo, [file]: { content, mdast } };
    }, {});
  };

  const parsed = parseFiles(dir);

  return {
    files: parsed,
    storeCache
  };
};
