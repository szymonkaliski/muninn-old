const chalk = require("chalk");
const path = require("path");
const { chain } = require("lodash");

const traverse = (node, callback) => {
  callback(node);

  if (node.children) {
    node.children.forEach(child => traverse(child, callback));
  }
};

const stripMarkdown = text => text.replace(/\[([^\]]+)\][^\)]+\)/g, "$1");

module.exports = ({ files, file, ...options }) => {
  const fileSearch = file.replace(/\ /g, "\\ ");

  const linkedFiles = chain(files)
    .entries()
    .map(([fileName, { mdast, content }]) => {
      let isLinked = false;
      let lineNumbers = [];

      traverse(mdast, node => {
        if (node.type === "link") {
          const isLocal =
            node.url.startsWith("./") ||
            node.url.startsWith("../") ||
            node.url.startsWith("/");

          if (isLocal) {
            const linkedFile = path.join(path.dirname(fileName), node.url);

            if (fileSearch === linkedFile) {
              lineNumbers.push(node.position.start);
              isLinked = true;
            }
          }
        }
      });

      return { fileName, content, isLinked, lineNumbers };
    })
    .filter(({ isLinked }) => isLinked === true)
    .value();

  if (options.vim) {
    linkedFiles.forEach(({ fileName, content, lineNumbers }) => {
      lineNumbers.forEach(({ line, column }) => {
        const lineText = stripMarkdown(content.split("\n")[line - 1]);
        console.log([fileName, line, column, lineText].join(":"));
      });
    });
  } else {
    linkedFiles.forEach(({ fileName, content, lineNumbers }) => {
      console.log(`${chalk.blue(fileName)}:`);

      lineNumbers.forEach(({ line }) => {
        const lineText = stripMarkdown(content.split("\n")[line - 1]).trim();
        console.log(lineText);
      });

      console.log();
    });
  }
};
