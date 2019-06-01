const unified = require("unified");
const markdown = require("remark-parse");
const stringify = require("remark-stringify");

const remarkDue = require("../remark-plugins/due");

const text = `
# big head

## test

- first line @due(2019-05-22)
- second line

`;

const withoutPositions = parsed => {
  delete parsed.position;

  if (parsed.children) {
    parsed.children.forEach(child => {
      withoutPositions(child);
    });
  }

  return parsed;
};

const mdast = withoutPositions(
  unified()
    .use(markdown)
    .use(remarkDue)
    .parse(text)
);

mdast.children.shift(); // remove "big head"
mdast.children[0].children[0].value = "heading!"; // change text 1
mdast.children[1].children[0].children[0].children[0].value =
  "testing text update asd asd sad "; // change text 2

mdast.children.push({
  type: "paragraph",
  children: [{ type: "text", value: "test insert" }]
});

console.log(JSON.stringify(mdast, null, 2));

const stringified = unified()
  .use(stringify, { listItemIndent: 1, fences: true })
  .use(remarkDue)
  .stringify(mdast);

console.log(stringified);
