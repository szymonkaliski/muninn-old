#!/usr/bin/env node

const yargs = require("yargs");

const createCache = require("./utils/cache");
const tasks = require("./tasks");

const args = yargs
  .command("tasks [directory]", "find all tasks in given directory", {
    days: { default: undefined },
    overdue: { default: true },
    "files-with-matches": { default: false }
  })
  .option("dir", {
    alias: "d",
    demandOption: true
  })
  .demandCommand(1, "you need to provide a command")
  .help().argv;

const [TYPE] = args._;

const { files, storeCache } = createCache(args.dir);

if (TYPE === "tasks") {
  tasks({
    files,
    overdue: args.overdue,
    days: args.days,
    filesWithMatches: args["files-with-matches"]
  });
}

storeCache();
