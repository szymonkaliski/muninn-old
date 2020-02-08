const React = require("react");
const path = require("path");
const { chain } = require("lodash");

const Markdown = require("./render-markdown");
const find = require("../../backlinks/find");
const { parseMarkdown, withParents } = require("../../markdown");

module.exports = ({ file, files, dir }) => {
  const links = find({ file, files });

  if (links.length === 0) {
    return null;
  }

  const grouped = chain(links)
    .groupBy("fileName")
    .values()
    .sortBy(d => d[0].fileName)
    .value();

  return (
    <div className="mt5 pv4 ph3 bg-near-white br1">
      {grouped.map((links, idx) => {
        const fileName = links[0].fileName;

        return (
          <div key={fileName}>
            <h3 className={`${idx === 0 ? "mt0" : "mt4"} mb2`}>
              <a
                className=" no-underline underline-hover dark-gray"
                href={`/#/${fileName}`}
              >
                {fileName}
              </a>
            </h3>

            {links.map(({ fileName, line, column, lineText }) => {
              const text = lineText.trim();
              const mdast = withParents(parseMarkdown(text));

              const finalDir = path.join(dir, path.dirname(fileName));
              const finalRoute = path.dirname(fileName).split("/");

              return (
                <div
                  key={[fileName, line, column].join("-")}
                  className="ml2 f6"
                >
                  <Markdown mdast={mdast} dir={finalDir} route={finalRoute} />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
