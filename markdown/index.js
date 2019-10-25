const markdown = require("remark-parse");
const stringify = require("remark-stringify");
const unified = require("unified");

const remarkDue = require("./remark-due");

const withIds = (mdast, currentKey) => {
  if (mdast.children) {
    mdast.children.forEach((child, i) => {
      const newKey = currentKey ? `${currentKey}-${i}` : `${i}`;
      child.id = newKey;
      withIds(child, newKey);
    });
  }

  return mdast;
};

const withParents = (mdast, parent) => {
  if (mdast.children) {
    mdast.children.forEach(child => {
      child.parent = parent || mdast;
      withParents(child, parent);
    });
  }

  return mdast;
};

const withoutParents = mdast => {
  delete mdast.parent;

  if (mdast.children) {
    mdast.children.forEach(child => {
      withoutParents(child);
    });
  }

  return mdast;
};

const withoutPositions = mdast => {
  delete mdast.position;

  if (mdast.children) {
    mdast.children.forEach(child => {
      withoutPositions(child);
    });
  }

  return mdast;
};

const stringifyMdast = mdast => {
  return unified()
    .use(stringify, { listItemIndent: 1, fences: true })
    .use(remarkDue)
    .stringify(mdast);
};

const fastStringifyMdast = mdast => {
  return mdast.children
    .filter(({ value = "" }) => !value.startsWith("\n"))
    .map(({ value, type, ...rest }) => {
      switch (type) {
        case "inlinceCode":
          return `\`${value}\``;

        case "link":
          return fastStringifyMdast({ children: rest.children });

        default:
          return value;
      }
    })
    .join("");
};

const parseMarkdown = text => {
  return withoutPositions(
    withIds(
      unified()
        .use(markdown)
        .use(remarkDue)
        .parse(text)
    )
  );
};

module.exports = {
  stringifyMdast,
  parseMarkdown,
  withParents,
  withoutParents,
  fastStringifyMdast
};
