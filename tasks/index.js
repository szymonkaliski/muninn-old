const chalk = require("chalk");
const visit = require("unist-util-visit-parents");
const { parse, format, differenceInHours } = require("date-fns");
const { sortBy, chain, nth, flatMap } = require("lodash");

const { stringifyMdast } = require("../markdown");

const dateToNum = date => (date ? parseInt(date.replace(/-/g, "")) : 0);

const DATE_FORMAT = "yyyy-MM-dd";
const TODAY = format(Date.now(), DATE_FORMAT);
const TODAY_DATE = Date.now();
const TODAY_NUM = dateToNum(TODAY);

const todosFromFiles = files => {
  const todosByDate = { overdue: [] };

  Object.entries(files).forEach(([file, { mdast }]) => {
    visit(mdast, "tag", (node, parents) => {
      if (node.tagName === "due" && !!node.tagValue) {
        const isDone = nth(parents, -2).checked === true;
        const isInPast = dateToNum(node.tagValue) < TODAY_NUM;
        const isOverdue = !isDone && isInPast;

        const text = stringifyMdast(nth(parents, -2));

        const todo = {
          date: parse(node.tagValue, DATE_FORMAT, Date.now()),
          due: node.tagValue,
          file,
          isDone,
          text,
          position: node.position
        };

        if (isOverdue) {
          todosByDate.overdue.push(todo);
        } else if (!isInPast) {
          if (!todosByDate[todo.due]) {
            todosByDate[todo.due] = [];
          }

          todosByDate[todo.due].push(todo);
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
    .filter(([date, _]) => {
      if (
        options.days !== undefined &&
        differenceInHours(parse(date, DATE_FORMAT, Date.now()), TODAY_DATE) >
          Math.max(options.days - 1, 0) * 24
      ) {
        return;
      } else {
        return true;
      }
    })
    .value();

  if (options.vim) {
    const log = todos => {
      todos.forEach(todo => {
        const { line, column } = todo.position.start;
        const firstLine = todo.text.split("\n")[0];

        console.log([todo.file, line, column, firstLine].join(":"));
      });
    };

    if (options.overdue && overdue.length > 0) {
      log(overdue);
    }

    log(flatMap(todos, ([_, todos]) => todos));
  } else {
    const log = todos => {
      chain(todos)
        .groupBy(task => task.file)
        .forEach((todos, file) => {
          console.log(`- ${chalk.blue(file)}:`);

          todos.forEach(({ text, isDone }) => {
            const indendentText = text
              .split("\n")
              .map(line => `  ${line}`)
              .join("\n");

            if (isDone) {
              console.log(chalk.gray(indendentText));
            } else {
              console.log(indendentText);
            }
          });
        })
        .value();
    };

    if (overdue.length > 0 && options.overdue) {
      console.log(chalk.red("Overdue"));
      log(overdue);
      console.log();
    }

    todos.forEach(([date, tasks]) => {
      if (date === TODAY) {
        console.log(chalk.green("Today"));
      } else {
        const weekday = format(parse(date, DATE_FORMAT, Date.now()), "EEEE");
        console.log(`${chalk.green(date)} ${chalk.grey(weekday)}`);
      }

      log(tasks);
      console.log();
    });
  }
};
