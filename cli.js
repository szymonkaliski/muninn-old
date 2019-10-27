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
  .option("dir", {
    alias: "d",
    demandOption: true
  })
  .demandCommand(1, "you need to provide a command")
  .help().argv;

const [TYPE] = args._;
const dir = path.resolve(args.dir);

const { files, tfidf, storeCache } = createCache(dir);

if (TYPE === "tasks") {
  tasks({
    files,
    overdue: args.overdue,
    days: args.days,
    filesWithMatches: args["files-with-matches"]
  });
} else if (TYPE === "related") {
  related({
    tfidf,
    file: args.file.replace(`${dir}/`, "")
  });
}

storeCache();
