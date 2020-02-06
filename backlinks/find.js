const path = require("path");
const { chain, identity, flatten, get } = require("lodash");

const traverse = (node, callback) => {
  callback(node);

  if (node.children) {
    node.children.forEach(child => traverse(child, callback));
  }
};

const linesLinkedByLink = ({ mdast, fileName, file }) => {
  const lineNumbers = [];

  traverse(mdast, node => {
    if (node.type === "link") {
      const isLocal = !node.url.match(/^http(s)?:\/\//);

      if (isLocal) {
        const linkedFile = path.join(path.dirname(fileName), node.url);

        if (file === linkedFile) {
          lineNumbers.push(node.position.start);
        }
      }
    }
  });

  return lineNumbers;
};

const linesLinkedByFile = ({ content, title }) => {
  const normalisedContent = content.toLowerCase();

  if (!normalisedContent.includes(title)) {
    return [];
  }

  return chain(normalisedContent)
    .split("\n")
    .map((line, index) => {
      if (line.includes(title)) {
        return {
          line: index + 1,
          column: line.indexOf(title)
        };
      }

      return null;
    })
    .filter(identity)
    .value();
};

module.exports = ({ files, file }) => {
  const content = get(files, [file, "content"]);

  if (!content || content.length === 0) {
    return [];
  }

  const hasTitle = content.split("\n")[0].startsWith("# ");

  const title =
    hasTitle &&
    content
      .split("\n")[0]
      .replace(/^#+\ /, "")
      .toLowerCase();

  const fileSearch = file.replace(/\ /g, "\\ ");

  return chain(files)
    .entries()
    .map(([fileName, { mdast, content }]) => ({
      fileName,
      content,
      lineNumbers: flatten([
        linesLinkedByLink({ mdast, fileName, file: fileSearch }),
        hasTitle ? linesLinkedByFile({ content, title }) : []
      ])
    }))
    .flatMap(({ lineNumbers, fileName, content }) =>
      lineNumbers.map(({ line, column }) => ({
        line,
        column,
        fileName,
        lineText: content.split("\n")[line - 1]
      }))
    )
    .filter(({ fileName }) => fileName !== file)
    .uniqBy(({ line, column, fileName }) => [fileName, line, column].join(":"))
    .sortBy(["fileName", "line", "column"])
    .value();
};
