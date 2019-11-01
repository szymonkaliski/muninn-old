#!/usr/bin/env node

const path = require("path");
const yargs = require("yargs");

const createCache = require("./utils/cache");
const tasks = require("./tasks");
const related = require("./related");
const getAsset = require("./get-asset");
const serveUI = require("./ui");

const args = yargs
  .command("tasks", "find all tasks in given directory", {
    days: { default: undefined },
    overdue: { default: true },
    "files-with-matches": {}
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
  .command("ui", "start web based ui", yargs => {
    yargs.option("port", { default: 8080 });
  })
  .command("clear-cache", "clear cache, will be rebuilt on next command")
  .option("dir", {
    alias: "d",
    demandOption: true
  })
  .demandCommand(1, "you need to provide a command")
  .help().argv;

const [TYPE] = args._;

const cache = createCache(args.dir);

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
      file: args.file.replace(args.dir, "")
    });

    cache.store();
  },

  ui: () => {
    serveUI({
      cache,
      dir: args.dir,
      port: args.port
    });
  },

  "get-asset": () => {
    getAsset({
      dir: args.dir,
      file: args.file,
      url: args.url
    });
  },

  "clear-cache": cache.clear
};

COMMANDS[TYPE]();
