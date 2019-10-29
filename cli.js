#!/usr/bin/env node

const path = require("path");
const yargs = require("yargs");

const createCache = require("./utils/cache");
const tasks = require("./tasks");
const related = require("./related");

const args = yargs
  .command("tasks", "find all tasks in given directory", {
    days: { default: undefined },
    overdue: { default: true },
    "files-with-matches": { default: false }
  })
  .command("related [file]", "find all notes related to given file")
  .command("clear-cache", "clear cache, will be rebuilt on next command")
  .option("dir", {
    alias: "d",
    demandOption: true
  })
  .demandCommand(1, "you need to provide a command")
  .help().argv;

const [TYPE] = args._;
const dir = path.resolve(args.dir);

const cache = createCache(dir);

if (TYPE === "tasks") {
  cache.parse();

  tasks({
    files: cache.getFiles(),
    overdue: args.overdue,
    days: args.days,
    filesWithMatches: args["files-with-matches"]
  });

  cache.store();
} else if (TYPE === "related") {
  cache.parse();

  related({
    tfidf: cache.getTfidf(),
    file: args.file.replace(`${dir}/`, "")
  });

  cache.store();
} else if (TYPE === "clear-cache") {
  cache.clear();
}
