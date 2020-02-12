const chalk = require("chalk");
const { chain } = require("lodash");

const find = require("./find");
const { stringifyMdast } = require("../markdown");

module.exports = ({ files, file, ...options }) => {
  const linked = find({ files, file });

  if (options.vim) {
    linked.forEach(({ fileName, mdast }) => {
      const { line, column } = mdast.position.start;
      const lineText = stringifyMdast(mdast).split("\n")[0];

      console.log([fileName, line, column, lineText].join(":"));
    });
  } else {
    chain(linked)
      .groupBy("fileName")
      .entries()
      .forEach(([fileName, linked]) => {
        console.log(`${chalk.blue(fileName)}:`);

        linked.forEach(({ mdast }) => console.log(stringifyMdast(mdast)));

        console.log();
      })
      .value();
  }
};
