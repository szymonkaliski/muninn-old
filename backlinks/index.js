const chalk = require("chalk");
const path = require("path");
const { chain, identity } = require("lodash");

const traverse = (node, callback) => {
  callback(node);

  if (node.children) {
    node.children.forEach(child => traverse(child, callback));
  }
};

// TODO: strip?
const stripMarkdown = text => text; //.replace(/\[([^\]]+)\][^\)]+\)/g, "$1"); - breaks done tasks - [x]...

const linesLinkedByLink = ({ mdast, fileName, fileSearch }) => {
  const lineNumbers = [];

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
        }
      }
    }
  });

  return lineNumbers;
};

const linesLinkedByFile = ({ content, titleSearch }) => {
  const normalisedContent = content.toLowerCase();

  if (!normalisedContent.includes(titleSearch)) {
    return [];
  }

  return chain(normalisedContent)
    .split("\n")
    .map((line, index) => {
      if (line.includes(titleSearch)) {
        return {
          line: index + 1,
          column: line.indexOf(titleSearch)
        };
      }

      return null;
    })
    .filter(identity)
    .value();
};

module.exports = ({ files, file, ...options }) => {
  const fileSearch = file.replace(/\ /g, "\\ ");

  // TODO: check if starts with `#` - otherwise no title
  const titleSearch = stripMarkdown(files[file].content.split("\n")[0])
    .replace(/^#+\ /, "")
    .toLowerCase();

  const linked = chain(files)
    .entries()
    .map(([fileName, { mdast, content }]) => ({
      fileName,
      content,
      lineNumbers: [
        ...linesLinkedByLink({ mdast, fileName, fileSearch }),
        ...linesLinkedByFile({ content, titleSearch })
      ]
    }))
    .filter(({ lineNumbers }) => lineNumbers.length > 0)
    .flatMap(({ lineNumbers, fileName, content }) =>
      lineNumbers.map(({ line, column }) => ({
        line,
        column,
        fileName,
        lineText: stripMarkdown(content.split("\n")[line - 1])
      }))
    )
    .uniqBy(({ line, column, fileName }) => [fileName, line, column].join(":"))
    .sortBy(["fileName", "line", "column"])
    .value();

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
