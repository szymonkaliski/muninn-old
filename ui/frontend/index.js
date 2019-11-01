// const io = require("socket.io-client");
const React = require("react");
const ReactDOM = require("react-dom");
const { ClientSocket, useSocket } = require("use-socketio");
const { last } = require("lodash");
const path = require("path");

const remarkToReact = require("remark-react");
const unified = require("unified");

const remarkDue = require("../../markdown/remark-due");

const useRoute = require("./use-route");
const { useState } = React;

require("tachyons");

const MarkdownLink = ({ href, children, context }) => {
  const isLocal = !href.startsWith("http");

  const url = isLocal
    ? `/#/${path.join(context.route.slice(0, -1).join("/"), href)}`
    : href;

  return (
    <a
      href={url}
      target={!isLocal ? "_blank" : ""}
      onClick={e => {
        e.stopPropagation();
      }}
    >
      {children}
    </a>
  );
};

const MarkdownImage = ({ src, alt, context }) => {
  const isLocal = !src.startsWith("http");

  console.log({ src, alt, context, isLocal });

  const url = isLocal
    ? "/asset/?path=" +
      path.join(context.dir, ...context.route.slice(0, -1), src)
    : src;

  return <img src={url} alt={alt} />;
};

const mdastToReact = ({ mdast }, context) =>
  unified()
    .use(remarkDue)
    .use(remarkToReact, {
      remarkReactComponents: {
        a: args => <MarkdownLink context={context} {...args} />,
        img: args => <MarkdownImage context={context} {...args} />
      }
    })
    .stringify(mdast);

const App = () => {
  const [route, _] = useRoute();
  const [files, setFiles] = useState(null);
  const [dir, setDir] = useState(null);

  useSocket("files", ({ files, dir }) => {
    setFiles(files);
    setDir(dir);
  });

  if (!files || !dir) {
    return null;
  }

  const finalRoute = (!(last(route) || "").endsWith(".md")
    ? [...route, "index.md"]
    : route
  ).join("/");

  console.log({ finalRoute, files, route });

  const tree = mdastToReact(files[finalRoute], { route, dir });

  return <div className="mw8 center sans-serif">{tree}</div>;
};

ReactDOM.render(
  <ClientSocket>
    <App />
  </ClientSocket>,
  document.getElementById("app")
);
