#!/usr/bin/env node

const chalk = require("chalk");
const fs = require("fs");
const glob = require("glob");
const path = require("path");
const yargs = require("yargs");
const { sortBy, chain } = require("lodash");
const { parse, format, differenceInDays } = require("date-fns");

const markdown = require("remark-parse");
const stringify = require("remark-stringify");
const unified = require("unified");

const remarkDue = require("./remark-plugins/due");

const argv = yargs.options({
  days: { alias: "d" },
  overdue: { default: true },
  "files-only": { defaul: false }
}).argv;

const stringifyMdast = mdast => {
  return unified()
    .use(stringify, { listItemIndent: 1, fences: true })
    .use(remarkDue)
    .stringify(mdast);
};

const parseMarkdown = text => {
  const withIds = (parsed, currentKey) => {
    if (parsed.children) {
      parsed.children.forEach((child, i) => {
        const newKey = currentKey ? `${currentKey}-${i}` : `${i}`;

        child.id = newKey;
        withIds(child, newKey);
      });
    }

    return parsed;
  };

  const withParents = (parsed, parent) => {
    if (parsed.children) {
      parsed.children.forEach(child => {
        child.parent = parent || parsed;
        withParents(child, parent);
      });
    }

    return parsed;
  };

  const withoutPositions = parsed => {
    delete parsed.position;

    if (parsed.children) {
      parsed.children.forEach(child => {
        withoutPositions(child);
      });
    }

    return parsed;
  };

  const parsed = withoutPositions(
    withParents(
      withIds(
        unified()
          .use(markdown)
          .use(remarkDue)
          .parse(text)
      )
    )
  );

  return parsed;
};

const [dir] = argv._;
const cwd = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);

const files = glob.sync("**/*.md", { cwd });

const traverse = (node, callback) => {
  callback(node);

  if (node.children) {
    node.children.forEach(child => traverse(child, callback));
  }
};

const dateToNum = date => (date ? parseInt(date.replace(/-/g, "")) : 0);

const today = format(Date.now(), "YYYY-MM-DD");
const todayNum = dateToNum(today);

const todosByDate = {};
let overdue = [];

files.forEach(file => {
  const fullPath = path.join(cwd, file);
  const mdast = parseMarkdown(fs.readFileSync(fullPath));

  traverse(mdast, node => {
    if (node.type === "due") {
      const isDone = node.parent.parent.checked === true;
      const isInPast = dateToNum(node.date) < todayNum;
      const isOverdue = !isDone && isInPast;

      const todo = {
        date: parse(node.date),
        done: isDone,
        due: node.date,
        file,
        fullPath,
        text: stringifyMdast(node.parent)
      };

      if (isOverdue) {
        overdue.push(todo);
      } else if (!isInPast) {
        if (!todosByDate[node.date]) {
          todosByDate[node.date] = [];
        }

        todosByDate[node.date].push(todo);
      }
    }
  });
});

overdue = sortBy(overdue, t => t.file);

const todos = chain(todosByDate)
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
    differenceInDays(parse(date), today) > argv.days
  ) {
    return;
  }

  if (argv["files-only"]) {
    tasks.forEach(t => filesOnlyList.push(t.file));
    return;
  }

  if (date === today) {
    console.log(chalk.green("Today"));
  } else {
    console.log(
      `${chalk.green(date)} ${chalk.grey(format(parse(date), "dddd"))}`
    );
  }

  tasks.forEach(task => {
    if (task.done) {
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
