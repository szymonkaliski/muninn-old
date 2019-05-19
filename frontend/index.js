const React = require("react");
const ReactDOM = require("react-dom");
const remark = require("remark");
const remarkToReact = require("remark-react");
const stringify = require("remark-stringify");
const { ClientSocket, useSocket } = require("use-socketio");
const taskListPlugin = require("remark-task-list");

const useRoute = require("./use-route");
const { useState } = React;

require("tachyons");

const getMarkdown = (data, route) => {
  return route.reduce((memo, routePath) => {
    if (memo[routePath]) {
      return memo[routePath].children || memo[routePath];
    }

    return null;
  }, data);
};

const App = () => {
  const [route, setRoute] = useRoute();
  const [data, setData] = useState();

  const socket = useSocket("data", data => {
    console.log({ data });
    setData(data);
  });

  const currentData = data && route ? getMarkdown(data, route) : undefined;

  const currentMarkdown = currentData
    ? remark()
        .use(taskListPlugin)
        .use(remarkToReact, {
          remarkReactComponents: {
            input: props => {
              console.log("input", props);

              const onChecked = id => {
                const newText = remark()
                  .use(stringify, { listItemIndent: 1 })
                  .use(taskListPlugin, { toggle: [id] })
                  .processSync(currentData.content).contents;

                console.log(newText);

                socket.emit("update-content", {
                  path: currentData.fullPath,
                  content: newText
                });
              };

              return (
                <input
                  type={props.type}
                  checked={props.checked}
                  onChange={e =>
                    onChecked(
                      e.target.parentElement.id.replace("user-content-", "")
                    )
                  }
                />
              );
            }
          }
        })
        .processSync(currentData.content).contents
    : undefined;

  console.log({ currentMarkdown });

  return (
    <div className="sans-serif w-80 center">
      <h4>{route.join("/")}</h4>

      <div className="mt4">{currentMarkdown}</div>
    </div>
  );
};

ReactDOM.render(
  <ClientSocket>
    <App />
  </ClientSocket>,
  document.getElementById("root")
);
