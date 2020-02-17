const Prism = require("prismjs");
const React = require("react");
const classNames = require("classnames");
const path = require("path");
const { get, last } = require("lodash");
const { parse, isToday, isBefore, isAfter } = require("date-fns");

require("prismjs/themes/prism.css");

const { stringifyMdast, parseMarkdown } = require("../../markdown");

const { useState, useEffect } = React;

const DATE_FORMAT = "yyyy-MM-dd";

const routeDir = route =>
  (last(route) || "").endsWith(".md") ? route.slice(0, -1) : route;

const MarkdownThematicBreak = () => (
  <hr style={{ border: 0, height: 1 }} className="bg-gray" />
);

const MarkdownHeading = ({ mdast, ...args }) => {
  const el = `h${mdast.depth}`;

  return React.createElement(el, {
    className: "lh-title mt4 mb2",
    onClick: () => {
      args.isEditable && args.setEditingId(mdast.id);
    },
    children: mdast.children.map(child => (
      <Markdown key={child.id} mdast={child} {...args} />
    ))
  });
};

const MarkdownText = ({ mdast }) => <span>{mdast.value}</span>;

const MarkdownDelete = ({ mdast, ...args }) => (
  <span className="strike">
    {mdast.children.map(child => (
      <Markdown key={child.id} mdast={child} {...args} />
    ))}
  </span>
);

const MarkdownBlockquote = ({ mdast, ...args }) => (
  <blockquote className="serif ml0 mt0 pl2 bl bw2 b--light-gray lh-copy">
    {mdast.children.map(child => (
      <Markdown key={child.id} mdast={child} {...args} />
    ))}
  </blockquote>
);

const MarkdownList = ({ mdast, ...args }) => {
  const el = mdast.ordered ? "ol" : "ul";
  const paddingLeft =
    get(mdast, ["parent", "type"]) !== "listItem" ? "pl0" : "pl2";

  return React.createElement(el, {
    className: `lh-copy list ${paddingLeft} ma0`,
    onClick: () => {
      args.isEditable && args.setEditingId(mdast.id);
    },
    children: mdast.children.map(child => (
      <Markdown key={child.id} mdast={child} {...args} />
    ))
  });
};

const MarkdownListItem = ({ mdast, ...args }) => {
  const isOrdered = get(mdast, "parent.ordered", false);
  const isTodo = mdast.checked !== null;

  let idx = isOrdered
    ? mdast.parent.children.findIndex(({ id }) => id === mdast.id)
    : 0;

  const dash = isOrdered ? `${idx + 1}.` : "-";

  const [firstChild, ...restChildren] = mdast.children;
  const shouldIndentChildren = get(restChildren, [0, "type"]) !== "list";

  return (
    <li className="list flex">
      <div className="flex-shrink-0" style={{ width: "20px" }}>
        {isTodo ? (
          <input
            checked={mdast.checked}
            type="checkbox"
            onClick={e => {
              e.stopPropagation();
            }}
            onChange={e => {
              e.stopPropagation();

              args.onUpdate(mdast.id, mdastFragment => {
                mdastFragment.checked = !mdastFragment.checked;
              });
            }}
          />
        ) : (
          <span className={`gray ml1 ${isOrdered ? "f6" : ""}`}>{dash}</span>
        )}
      </div>

      <div>
        <div className={mdast.checked ? "strike gray" : ""}>
          <Markdown
            key={firstChild.id}
            mdast={firstChild}
            dontWrapParagraph={true}
            {...args}
          />
        </div>

        <div className={shouldIndentChildren ? "pl2" : ""}>
          {restChildren.map(child => (
            <Markdown key={child.id} mdast={child} {...args} />
          ))}
        </div>
      </div>
    </li>
  );
};

const MarkdownParagraph = ({ mdast, dontWrapParagraph, ...args }) => {
  if (dontWrapParagraph) {
    return (
      <>
        {mdast.children.map(child => (
          <Markdown key={child.id} mdast={child} {...args} />
        ))}
      </>
    );
  }

  return (
    <p
      onClick={() => {
        args.isEditable && args.setEditingId(mdast.id);
      }}
    >
      {mdast.children.map(child => (
        <Markdown key={child.id} mdast={child} {...args} />
      ))}
    </p>
  );
};

const MarkdownLink = ({ mdast, ...args }) => {
  const isLocal = !mdast.url.match(/^http(s)?:\/\//);

  const localPath =
    isLocal && path.join(...routeDir(args.route), mdast.url).replace(/\\/g, "");

  const url = isLocal ? `/#/${localPath}` : mdast.url;

  return (
    <>
      <a
        className="blue no-underline underline-hover"
        href={url}
        target={!isLocal ? "_blank" : ""}
        onClick={e => {
          e.stopPropagation();
        }}
      >
        {mdast.children.map(child => (
          <Markdown key={child.id} mdast={child} {...args} />
        ))}
        {!isLocal && <span className="blue">↗</span>}
      </a>
    </>
  );
};

const MarkdownTag = ({ mdast }) => {
  const isDue = mdast.tagName === "due" && !!mdast.tagValue;

  if (isDue) {
    const dueDate = parse(mdast.tagValue, DATE_FORMAT, Date.now());

    const dueToday = isToday(dueDate);
    const duePast = isBefore(dueDate, Date.now());
    const dueFuture = isAfter(dueDate, Date.now());

    const checked = get(mdast, ["parent", "parent", "checked"], false);

    return (
      <span
        className={classNames({
          green: dueToday && !checked,
          red: duePast && !checked,
          gray: dueFuture || checked
        })}
      >
        {mdast.value}
      </span>
    );
  } else {
    return <span className="gray">{mdast.value}</span>;
  }
};

const MarkdownCode = ({ mdast, ...args }) => {
  const { lang, value: code } = mdast;
  const html = Prism.highlight(code, Prism.languages.javascript, lang);

  return (
    <pre
      className="f6"
      onClick={() => args.isEditable && args.setEditingId(mdast.id)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

const MarkdownInlineCode = ({ mdast }) => (
  <code className="f7 bg-light-gray pa1">{mdast.value}</code>
);

const MarkdownEmphasis = ({ mdast, ...args }) => (
  <span className="i">
    {mdast.children.map(child => (
      <Markdown key={child.id} mdast={child} {...args} />
    ))}
  </span>
);

const MarkdownStrong = ({ mdast, ...args }) => (
  <span className="fw6">
    {mdast.children.map(child => (
      <Markdown key={child.id} mdast={child} {...args} />
    ))}
  </span>
);

const MarkdownImage = ({ mdast, ...args }) => {
  const isLocal = !mdast.url.match(/^http(s)?:\/\//);

  const url = isLocal
    ? "/asset/?path=" +
      path.join(args.dir, ...args.route.slice(0, -1), mdast.url)
    : mdast.url;

  return <img src={url} alt={mdast.alt} />;
};

const MarkdownTable = ({ mdast, ...args }) => (
  <table className="w-100 pv2 f6" cellSpacing={0}>
    <MarkdownTableHead mdast={mdast.children[0]} {...args} />

    <tbody>
      {mdast.children.slice(1).map(child => (
        <Markdown key={child.id} mdast={child} {...args} />
      ))}
    </tbody>
  </table>
);

const MarkdownTableHead = ({ mdast, ...args }) => (
  <thead>
    <tr className="bg-white">
      {mdast.children.map(child => (
        <th className="fw6 pa2 bg-white" key={child.id}>
          <Markdown mdast={child.children[0]} {...args} />
        </th>
      ))}
    </tr>
  </thead>
);

const MarkdownTableRow = ({ mdast, ...args }) => (
  <tr className="stripe-dark">
    {mdast.children.map(child => (
      <Markdown key={child.id} mdast={child} {...args} />
    ))}
  </tr>
);

const MarkdownTableCell = ({ mdast, ...args }) => (
  <td className="pa2">
    {mdast.children.map(child => (
      <Markdown key={child.id} mdast={child} {...args} />
    ))}
  </td>
);

const MarkdownConcealEdit = ({ mdast, ...args }) => {
  const [text, setText] = useState(null);

  useEffect(() => {
    if (text === null) {
      setText(stringifyMdast(mdast));
    }
  }, [text]);

  if (text === null) {
    return null;
  }

  return (
    <textarea
      className="bw0 pa0 bg-near-white w-100 code f6 pa2 lh-copy"
      autoFocus={true}
      rows={text.split("\n").length}
      value={text}
      onChange={e => {
        setText(e.target.value);
      }}
      onKeyDown={e => {
        if (e.key === "Escape") {
          const newMdast = parseMarkdown(text);
          const currentId = parseInt(mdast.id); // assuming it's a single digit?

          args.onUpdate(mdast.id, mdastFramgent => {
            mdastFramgent.parent.children = [
              ...mdastFramgent.parent.children.slice(0, currentId),
              ...newMdast.children,
              ...mdastFramgent.parent.children.slice(currentId + 1)
            ];
          });

          args.setEditingId(null);
        }
      }}
    />
  );
};

// unsupported
const MarkdownLinkReference = ({ mdast }) => `[${mdast.label}]`;

const MarkdownUnsupported = ({ mdast }) => {
  console.warn(`Unsupported type ${mdast.type}`, mdast);
  return mdast.value || mdast.text || mdast.label || null;
};

const Markdown = ({ mdast, onCommit, ...args }) => {
  if (args.isEditable && mdast.id === args.editingId) {
    return <MarkdownConcealEdit key={mdast.id} mdast={mdast} {...args} />;
  } else if (mdast.type === "root") {
    return (
      <>
        {mdast.children.map(child => {
          const editFunctions = args.isEditable
            ? {
                setEditingId: args.setEditingId,
                onUpdate: (id, callback) => {
                  const path = id.split("-").map(n => parseInt(n));

                  let tmpMdast = mdast.children;

                  path.forEach((p, i) => {
                    if (i < path.length - 1) {
                      tmpMdast = tmpMdast[p].children;
                    } else {
                      callback(tmpMdast[p]);
                    }
                  });

                  onCommit(mdast);
                }
              }
            : {};

          return (
            <Markdown
              key={child.id}
              mdast={child}
              {...args}
              {...editFunctions}
            />
          );
        })}
      </>
    );
  } else if (mdast.type) {
    const types = {
      blockquote: MarkdownBlockquote,
      code: MarkdownCode,
      delete: MarkdownDelete,
      emphasis: MarkdownEmphasis,
      heading: MarkdownHeading,
      image: MarkdownImage,
      inlineCode: MarkdownInlineCode,
      link: MarkdownLink,
      linkReference: MarkdownLinkReference,
      list: MarkdownList,
      listItem: MarkdownListItem,
      paragraph: MarkdownParagraph,
      strong: MarkdownStrong,
      table: MarkdownTable,
      tableCell: MarkdownTableCell,
      tableRow: MarkdownTableRow,
      tag: MarkdownTag,
      text: MarkdownText,
      thematicBreak: MarkdownThematicBreak
    };

    if (types[mdast.type] === undefined) {
      return <MarkdownUnsupported mdast={mdast} />;
    }

    return React.createElement(types[mdast.type], {
      key: mdast.id,
      mdast,
      ...args
    });
  } else {
    console.error("Something went wrong", mdast);
    return null;
  }
};

module.exports = Markdown;
