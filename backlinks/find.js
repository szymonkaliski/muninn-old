const path = require("path");
const visit = require("unist-util-visit-parents");
const { chain, get, last, findLastIndex, identity } = require("lodash");

const findMeaningfulParent = (parents) => {
  const parentTypes = ["listItem", "blockquote", "paragraph"];

  return parents[
    chain(parentTypes)
      .map((type) => findLastIndex(parents, (node) => node.type === type))
      .filter((idx) => idx >= 0)
      .min()
      .value()
  ];
};

const findLinked = ({ mdast, fileName, fileSearch, titleSearch }) => {
  const linked = [];

  visit(mdast, (node, parents) => {
    if (node.type === "text") {
      if (
        titleSearch &&
        node.value.toLowerCase().includes(titleSearch) &&
        last(parents).type !== "heading"
      ) {
        linked.push(findMeaningfulParent(parents));
      }
    } else if (node.type === "link") {
      const isLocal = !node.url.match(/^http(s)?:\/\//);

      if (isLocal) {
        const linkedFile = path.join(path.dirname(fileName), node.url);

        if (fileSearch === linkedFile) {
          linked.push(findMeaningfulParent(parents));
        }
      }
    }
  });

  return linked;
};

module.exports = ({ files, file }) => {
  const content = get(files, [file, "content"]);

  if (!content || content.length === 0) {
    return [];
  }

  const hasTitle = content.split("\n")[0].startsWith("# ");

  const title =
    hasTitle && content.split("\n")[0].replace(/^#+\ /, "").toLowerCase();

  const fileSearch = file.replace(/\ /g, "\\ ");

  const linked = chain(files)
    .entries()
    .filter(([fileName, _]) => fileName !== file)
    .map(([fileName, { mdast }]) => ({
      fileName,
      linked: findLinked({
        mdast,
        fileName,
        fileSearch,
        titleSearch: title,
      }),
    }))
    .flatMap(({ linked, fileName }) =>
      linked.filter(identity).map((mdast) => ({ fileName, mdast }))
    )
    .sortBy(["fileName", ({ mdast }) => mdast.id])
    .uniqWith((a, b) => {
      if (a.fileName !== b.fileName) {
        return false;
      }

      return a.mdast.id.startsWith(b.mdast.id);
    })
    .value();

  return linked;
};
