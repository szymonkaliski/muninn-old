const Prism = require("prismjs");
const React = require("react");
const ReactDOM = require("react-dom");
const classNames = require("classnames");
const { ClientSocket, useSocket } = require("use-socketio");
const { get } = require("lodash");
const { isToday, isBefore, isAfter, parse } = require("date-fns");

const markdown = require("remark-parse");
const stringify = require("remark-stringify");
const unified = require("unified");

const remarkDue = require("../remark-plugins/due");

const useRoute = require("./use-route");
const { useState, useEffect } = React;

require("prismjs/themes/prism.css");
require("tachyons");

const getMarkdown = (data, route) => {
  return route.reduce((memo, routePath) => {
    if (memo[routePath]) {
      return memo[routePath].children || memo[routePath];
    }

    return null;
  }, data);
};

const MarkdownHeading = ({ mdast, ...args }) => {
  const el = `h${mdast.depth}`;

  return React.createElement(el, {
    children: mdast.children.map(child => (
      <Markdown key={child.id} mdast={child} {...args} />
    ))
  });
};

const MarkdownText = ({ mdast }) => {
  return <span>{mdast.value}</span>;
};

const MarkdownList = ({ mdast, ...args }) => {
  const el = mdast.ordered ? "ol" : "ul";

  return React.createElement(el, {
    children: mdast.children.map(child => (
      <Markdown key={child.id} mdast={child} {...args} />
    ))
  });
};

const MarkdownListItem = ({ mdast, onUpdate, ...args }) => {
  const isTodo = mdast.checked !== null;

  return (
    <li>
      {isTodo && (
        <input
          className="mr2"
          checked={mdast.checked}
          type="checkbox"
          onChange={() =>
            onUpdate(mdast.id, { ...mdast, checked: !mdast.checked })
          }
        />
      )}
      <span className={mdast.checked ? "strike gray" : ""}>
        {mdast.children[0].children.map(child => (
          <Markdown key={child.id} mdast={child} {...args} />
        ))}
      </span>
    </li>
  );
};

const MarkdownParagraph = ({ mdast, ...args }) => {
  return (
    <p>
      {mdast.children.map(child => (
        <Markdown key={child.id} mdast={child} {...args} />
      ))}
    </p>
  );
};

const MarkdownLink = ({ mdast, ...args }) => {
  const isLocal = mdast.url.startsWith("./");
  const url = isLocal ? mdast.url.replace("./", "/#/") : mdast.url;

  return (
    <a href={url}>
      {mdast.children.map(child => (
        <Markdown key={child.id} mdast={child} {...args} />
      ))}
    </a>
  );
};

const MarkdownDue = ({ mdast }) => {
  const dueDate = parse(mdast.date);

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

const MarkdownCode = ({ mdast }) => {
  const { lang, value: code } = mdast;

  const html = Prism.highlight(code, Prism.languages[lang], lang);

  return <pre dangerouslySetInnerHTML={{ __html: html }} />;
};

const MarkdownImage = ({ mdast }) => {
  return <img src={mdast.url} alt={mdast.alt} />;
};

const Markdown = ({ mdast, onCommit, ...args }) => {
  if (mdast.type === "root") {
    return (
      <>
        {mdast.children.map(child => (
          <Markdown
            key={child.id}
            mdast={child}
            {...args}
            onUpdate={(id, update) => {
              const path = id.split("-").map(n => parseInt(n));
              let tmpMdast = mdast.children;

              path.forEach((p, i) => {
                if (i < path.length - 1) {
                  tmpMdast = tmpMdast[p].children;
                } else {
                  tmpMdast[p] = update;
                }
              });

              onCommit(mdast);
            }}
          />
        ))}
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
      image: MarkdownImage,
      due: MarkdownDue
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
    console.warn("Something went wrong", mdast);
    return null;
  }
};

const withIds = (parsed, currentKey) => {
  if (parsed.children) {
    parsed.children.forEach((child, i) => {
      const newKey = currentKey ? `${currentKey}-${i}` : `${i}`;

      child.id = newKey;
      withIds(child, newKey);
    });
  }

  return parsed;
};

const withParents = (parsed, parent) => {
  if (parsed.children) {
    parsed.children.forEach(child => {
      child.parent = parent || parsed;
      withParents(child, parent);
    });
  }

  return parsed;
};

const App = () => {
  const [route, setRoute] = useRoute();
  const [data, setData] = useState(null);

  const socket = useSocket("data", data => {
    console.log("data from server", data);
    setData(data);
  });

  useEffect(() => {
    if (data === null) {
      socket.emit("data");
    }
  }, [data]);

  const currentData = data && route ? getMarkdown(data, route) : undefined;

  if (!currentData) {
    // TODO: automatic index?
    return null;
  }

  const parsed = withParents(
    withIds(
      unified()
        .use(markdown)
        .use(remarkDue)
        .parse(currentData.content)
    )
  );

  console.log({ parsed });

  return (
    <div className="sans-serif w-80 center">
      <h4>{route.join("/")}</h4>

      <div className="mt4">
        <Markdown
          mdast={parsed}
          route={route}
          setRoute={setRoute}
          onCommit={mdast => {
            const stringified = unified()
              .use(stringify, { listItemIndent: 1, fences: true })
              .use(remarkDue)
              .stringify(mdast);

            socket.emit("update-content", {
              path: currentData.fullPath,
              content: stringified
            });
          }}
        />
      </div>
    </div>
  );
};

ReactDOM.render(
  <ClientSocket>
    <App />
  </ClientSocket>,
  document.getElementById("root")
);
