#!/usr/bin/env node

const path = require("path");
const yargs = require("yargs");

const createCache = require("./utils/cache");
const tasks = require("./tasks");
const related = require("./related");
const getAsset = require("./get-asset");

const args = yargs
  .command("tasks", "find all tasks in given directory", {
    days: { default: undefined },
    overdue: { default: true },
    "files-with-matches": { default: false }
  })
  .command("related", "find all notes related to given file", yargs => {
    yargs.option("file", {
      demandOption: true,
      describe: "input file to search for related ones"
    });
  })
  .command(
    "get-asset",
    "downloads asset and returns markdown embed/link",
    yargs => {
      yargs
        .option("url", { demandOption: true, describe: "url to asset" })
        .option("file", {
          demandOption: true,
          describe: "file where the asset will be added"
        });
    }
  )
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

const COMMANDS = {
  tasks: () => {
    cache.parse();

    tasks({
      files: cache.getFiles(),
      overdue: args.overdue,
      days: args.days,
      filesWithMatches: args["files-with-matches"]
    });

    cache.store();
  },

  related: () => {
    cache.parse();

    related({
      tfidf: cache.getTfidf(),
      file: args.file.replace(`${dir}/`, "")
    });

    cache.store();
  },

  "get-asset": () => {
    getAsset({
      file: args.file,
      url: args.url
    });
  },

  "clear-cache": cache.clear
};

COMMANDS[TYPE]();
