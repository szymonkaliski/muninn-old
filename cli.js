#!/usr/bin/env node

const LRU = require("lru-cache");
const chalk = require("chalk");
const envPaths = require("env-paths");
const fs = require("fs");
const glob = require("glob");
const md5 = require("md5");
const mkdirp = require("mkdirp");
const path = require("path");
const yargs = require("yargs");
const { parse, format, differenceInDays } = require("date-fns");
const { sortBy, chain, get } = require("lodash");

const {
  fastStringifyMdast,
  parseMarkdown,
  withParents,
  withoutParents
} = require("./markdown");

// cache

const CACHE_PATH = envPaths("muninn").cache;
const CACHE_FILE = path.join(CACHE_PATH, "cache.json");

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

// args

const argv = yargs.options({
  days: { alias: "d" },
  overdue: { default: true },
  "files-only": { defaul: false }
}).argv;

const [dir] = argv._;
const cwd = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);

// utils

const traverse = (node, callback) => {
  callback(node);

  if (node.children) {
    node.children.forEach(child => traverse(child, callback));
  }
};

const dateToNum = date => (date ? parseInt(date.replace(/-/g, "")) : 0);

// consts

const DATE_FORMAT = "yyyy-MM-dd";
const TODAY = format(Date.now(), DATE_FORMAT);
const TODAY_DATE = Date.now();
const TODAY_NUM = dateToNum(TODAY);

// main

const todosFromFiles = files => {
  const todosByDate = { overdue: [] };

  files.forEach(file => {
    const fullPath = path.join(cwd, file);
    const content = fs.readFileSync(fullPath);
    const hash = md5(content);

    let mdast = cache.get(hash);

    if (!mdast) {
      mdast = parseMarkdown(content);
      cache.set(hash, mdast);
    }

    traverse(withParents(mdast), node => {
      if (node.type === "due") {
        const isDone = get(node, "parent.parent.checked", false);
        const isInPast = dateToNum(node.date) < TODAY_NUM;
        const isOverdue = !isDone && isInPast;
        const text = fastStringifyMdast(node.parent);

        const todo = {
          date: parse(node.date, DATE_FORMAT, Date.now()),
          due: node.date,
          file,
          fullPath,
          isDone: isDone,
          text
        };

        if (isOverdue) {
          todosByDate.overdue.push(todo);
        } else if (!isInPast) {
          if (!todosByDate[node.date]) {
            todosByDate[node.date] = [];
          }

          todosByDate[node.date].push(todo);
        }
      }
    });
  });

  todosByDate.overdue = sortBy(todosByDate.overdue, t => t.file);

  return todosByDate;
};

const run = () => {
  const files = glob.sync("**/*.md", { cwd });

  const todosByDate = todosFromFiles(files);
  const { overdue } = todosByDate;

  const todos = chain(todosByDate)
    .omit(["overdue"])
    .entries()
    .sortBy(t => dateToNum(t[0]))
    .value();

  if (overdue.length > 0 && argv.overdue) {
    console.log(chalk.red("Overdue"));

    overdue.forEach(task => {
      console.log(`- ${chalk.blue(task.file)}: ${task.text}`);
    });

    console.log();
  }

  const filesOnlyList = [];

  todos.forEach(([date, tasks]) => {
    if (
      argv.days !== undefined &&
      differenceInDays(parse(date, DATE_FORMAT, Date.now()), TODAY_DATE) >
        argv.days
    ) {
      return;
    }

    if (argv["files-only"]) {
      tasks.forEach(t => filesOnlyList.push(t.file));
      return;
    }

    if (date === TODAY) {
      console.log(chalk.green("Today"));
    } else {
      console.log(
        `${chalk.green(date)} ${chalk.grey(
          format(parse(date, DATE_FORMAT, Date.now()), "EEEE")
        )}`
      );
    }

    tasks.forEach(task => {
      if (task.isDone) {
        console.log(chalk.gray(`- ${task.file}: ${task.text}`));
      } else {
        console.log(`- ${chalk.blue(task.file)}: ${task.text}`);
      }
    });

    console.log();
  });

  if (argv["files-only"]) {
    chain(filesOnlyList)
      .uniq()
      .forEach(f => console.log(f))
      .value();
  }
};

run();
storeCache();
