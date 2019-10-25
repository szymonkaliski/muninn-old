const chalk = require("chalk");
const { parse, format, differenceInDays } = require("date-fns");
const { sortBy, chain, get } = require("lodash");

const { fastStringifyMdast, withParents } = require("../markdown");

const traverse = (node, callback) => {
  callback(node);

  if (node.children) {
    node.children.forEach(child => traverse(child, callback));
  }
};

const dateToNum = date => (date ? parseInt(date.replace(/-/g, "")) : 0);

const DATE_FORMAT = "yyyy-MM-dd";
const TODAY = format(Date.now(), DATE_FORMAT);
const TODAY_DATE = Date.now();
const TODAY_NUM = dateToNum(TODAY);

const todosFromFiles = files => {
  const todosByDate = { overdue: [] };

  Object.entries(files).forEach(([file, { mdast }]) => {
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

module.exports = options => {
  const todosByDate = todosFromFiles(options.files);
  const { overdue } = todosByDate;

  const todos = chain(todosByDate)
    .omit(["overdue"])
    .entries()
    .sortBy(t => dateToNum(t[0]))
    .value();

  if (overdue.length > 0 && options.overdue) {
    console.log(chalk.red("Overdue"));

    overdue.forEach(task => {
      console.log(`- ${chalk.blue(task.file)}: ${task.text}`);
    });

    console.log();
  }

  const filesOnlyList = [];

  todos.forEach(([date, tasks]) => {
    if (
      options.days !== undefined &&
      differenceInDays(parse(date, DATE_FORMAT, Date.now()), TODAY_DATE) >
        options.days
    ) {
      return;
    }

    if (options.filesWithMatches) {
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

  if (options.filesWithMatches) {
    chain(filesOnlyList)
      .uniq()
      .forEach(f => console.log(f))
      .value();
  }
};
