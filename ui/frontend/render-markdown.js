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

const MarkdownText = ({ mdast }) => {
  return <span>{mdast.value}</span>;
};

const MarkdownBlockquote = ({ mdast, ...args }) => {
  return (
    <blockquote className="serif ml0 mt0 pl2 bl bw2 b--light-gray">
      {mdast.children.map(child => (
        <Markdown key={child.id} mdast={child} {...args} />
      ))}
    </blockquote>
  );
};

const MarkdownList = ({ mdast, ...args }) => {
  const el = mdast.ordered ? "ol" : "ul";
  const paddingLeft = get(mdast, ["parent", "type"]) !== "listItem" ? "pl0" : "pl4";

  return React.createElement(el, {
    className: `lh-copy list ${paddingLeft}`,
    onClick: () => {
      args.isEditable && args.setEditingId(mdast.id);
    },
    children: mdast.children.map(child => (
      <Markdown key={child.id} mdast={child} {...args} />
    ))
  });
};

const MarkdownListItem = ({ mdast, ...args }) => {
  const isTodo = mdast.checked !== null;

  const [firstChild, ...restChildren] = mdast.children;
  const shouldIndentChildren = get(restChildren, [0, "type"]) !== "list";

  return (
    <li>
      <div className="dib" style={{ width: "20px" }}>
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
          <span className="gray ml1">-</span>
        )}
      </div>

      <span className={mdast.checked ? "strike gray" : ""}>
        <Markdown
          key={firstChild.id}
          mdast={firstChild}
          dontWrapParagraph={true}
          {...args}
        />
      </span>

      <div className={shouldIndentChildren ? "pl4" : ""}>
        {restChildren.map(child => (
          <Markdown key={child.id} mdast={child} {...args} />
        ))}
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
  const isLocal = mdast.url.startsWith("./");

  const url = isLocal
    ? `/#/${path.join(routeDir(args.route).join("/"), mdast.url).replace(/\\/g, "")}`
    : mdast.url;

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

const MarkdownDue = ({ mdast }) => {
  const dueDate = parse(mdast.date, DATE_FORMAT, Date.now());

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

const MarkdownInlineCode = ({ mdast }) => {
  return <code className="f7 bg-light-gray pa1">{mdast.value}</code>;
};

const MarkdownEmphasis = ({ mdast, ...args }) => {
  return (
    <span className="i">
      {mdast.children.map(child => (
        <Markdown key={child.id} mdast={child} {...args} />
      ))}
    </span>
  );
};

const MarkdownStrong = ({ mdast, ...args }) => {
  return (
    <span className="fw6">
      {mdast.children.map(child => (
        <Markdown key={child.id} mdast={child} {...args} />
      ))}
    </span>
  );
};

const MarkdownImage = ({ mdast, ...args }) => {
  const isLocal = !mdast.url.startsWith("http");

  const url = isLocal
    ? "/asset/?path=" +
      path.join(args.dir, ...args.route.slice(0, -1), mdast.url)
    : mdast.url;

  return <img src={url} alt={mdast.alt} />;
};

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
      heading: MarkdownHeading,
      text: MarkdownText,
      list: MarkdownList,
      listItem: MarkdownListItem,
      paragraph: MarkdownParagraph,
      link: MarkdownLink,
      code: MarkdownCode,
      inlineCode: MarkdownInlineCode,
      image: MarkdownImage,
      due: MarkdownDue,
      emphasis: MarkdownEmphasis,
      strong: MarkdownStrong,
      blockquote: MarkdownBlockquote
    };

    if (types[mdast.type] === undefined) {
      console.warn(`Unsupported type ${mdast.type}`, mdast);
      return null;
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
