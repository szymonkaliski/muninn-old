const path = require("path");
const visit = require("unist-util-visit-parents");
const { chain, get, last } = require("lodash");

const findLinked = ({ mdast, fileName, fileSearch, titleSearch }) => {
  const lineNumbers = [];

  visit(mdast, (node, parents) => {
    if (node.type === "text") {
      if (
        titleSearch &&
        node.value.toLowerCase().includes(titleSearch) &&
        last(parents).type !== "heading"
      ) {
        const position = node.position || last(parents).position;
        lineNumbers.push(position.start);
      }
    }

    if (node.type === "link") {
      const isLocal = !node.url.match(/^http(s)?:\/\//);

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
      lineNumbers: findLinked({
        mdast,
        fileName,
        fileSearch,
        titleSearch: title
      })
    }))
    .flatMap(({ lineNumbers, fileName, content }) =>
      lineNumbers.map(({ line, column }) => ({
        line,
        column,
        fileName,
        lineText: content.split("\n")[line - 1].trim()
      }))
    )
    .filter(({ fileName }) => fileName !== file)
    .uniqBy(({ line, fileName }) => [fileName, line].join(":"))
    .sortBy(["fileName", "line", "column"])
    .value();
};
