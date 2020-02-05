const chalk = require("chalk");
const { chain } = require("lodash");

const find = require("./find");

module.exports = ({ files, file, ...options }) => {
  const fileSearch = file.replace(/\ /g, "\\ ");
  const linked = find({ files, file: fileSearch });

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

        linked.forEach(({ lineText }) =>
          console.log(lineText.trim())
        );

        console.log();
      })
      .value();
  }
};
