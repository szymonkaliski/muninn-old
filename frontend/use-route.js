const { useState, useEffect } = require("react");

const parseHashURL = url =>
  new URL(url).hash
    .split("#/")
    .pop()
    .split("/");

module.exports = () => {
  const [route, setRoute] = useState(parseHashURL(location));

  const hashChangeHandler = e => {
    e.preventDefault();
    setRoute(parseHashURL(e.newURL));
  };

  useEffect(() => {
    window.location.hash = "#/" + route.join("/");
  }, [route]);

  useEffect(() => {
    window.addEventListener("hashchange", hashChangeHandler);
    return () => window.removeEventListener("hashchange", hashChangeHandler);
  }, []);

  return [route, setRoute];
};
