const LRU = require("lru-cache");
const envPaths = require("env-paths");
const fs = require("fs");
const glob = require("glob");
const md5 = require("md5");
const path = require("path");
const stopwords = require("stopwords-json/dist/en.json");
const { TfIdf } = require("natural");

const {
  parseMarkdown,
  withoutParents,
  stringifyMdastToPlainText
} = require("../markdown");

const CACHE_PATH = envPaths("muninn").cache;
const CACHE_FILE = path.join(CACHE_PATH, "cache.json");

const STOPWORDS = [
  "code",
  "commit",
  "data",
  "editing",
  "enter",
  "function",
  "http",
  "https",
  "image",
  "live",
  "long",
  "show",
  "typing",
  "user",
  "video",
  ...stopwords
];

const createCache = () => {
  const cache = new LRU({
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  if (!fs.existsSync(CACHE_PATH)) {
    mkdirp(CACHE_PATH);
  }

  let cachedData;

  if (fs.existsSync(CACHE_FILE)) {
    try {
      cachedData = require(CACHE_FILE);
    } catch (e) {
      console.error(e);
    }
  }

  if (cachedData) {
    cache.load(cachedData.cache);
  }

  let tfidf;

  if (cachedData) {
    tfidf = new TfIdf(cachedData.tfidf);
  } else {
    tfidf = new TfIdf();
    // stopwords only make a difference with parsing, to update them the cache has to be pruned
    tfidf.setStopwords(STOPWORDS);
  }

  const storeCache = () => {
    const cacheData = cache.dump().map(d => ({
      ...d,
      v: withoutParents(d.v)
    }));

    const json = JSON.stringify({ cache: cacheData, tfidf });

    fs.writeFileSync(CACHE_FILE, json, { encoding: "utf-8" });
  };

  return { tfidf, cache, storeCache };
};

module.exports = dir => {
  const { tfidf, cache, storeCache } = createCache();

  dir = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);

  const parseFiles = dir => {
    const files = glob.sync("**/*.md", { cwd: dir });

    return files.reduce((memo, file) => {
      const fullPath = path.join(dir, file);
      const content = fs.readFileSync(fullPath, { encoding: "utf-8" });
      const hash = md5(content);

      let mdast = cache.get(hash);

      if (!mdast) {
        mdast = parseMarkdown(content);
        tfidf.addDocument(stringifyMdastToPlainText(mdast), file);

        cache.set(hash, mdast);
      }

      return { ...memo, [file]: { content, mdast } };
    }, {});
  };

  const parsed = parseFiles(dir);

  return {
    files: parsed,
    tfidf,
    storeCache
  };
};
