const chalk = require("chalk");
const { chain } = require("lodash");

const { withParents } = require("../markdown");
const find = require("./find");

module.exports = ({ files, file, ...options }) => {
  Object.keys(files).forEach(key => {
    files[key].mdast = withParents(files[key].mdast);
  });

  const linked = find({ files, file });

  if (options.vim) {
    linked.forEach(({ fileName, line, column, lineText }) => {
      console.log([fileName, line, column, lineText].join(":"));
    });
  } else {
    chain(linked)
      .groupBy("fileName")
      .entries()
      .forEach(([fileName, linked]) => {
        console.log(`${chalk.blue(fileName)}:`);

        linked.forEach(({ lineText }) => console.log(lineText.trim()));

        console.log();
      })
      .value();
  }
};
