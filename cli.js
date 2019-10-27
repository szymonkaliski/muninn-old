#!/usr/bin/env node

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

const { files, tfidf, storeCache } = createCache(args.dir);

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
    file: args.file.replace(args.dir, "")
  });
}

storeCache();
