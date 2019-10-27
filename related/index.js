const { chain } = require("lodash");

module.exports = ({ tfidf, ...options }) => {
  const keyToIndex = key => tfidf.documents.findIndex(doc => doc.__key === key);

  const terms = tfidf
    .listTerms(keyToIndex(options.file))
    .filter(({ term }) => term.length > 3)
    .filter(({ term }) => isNaN(term))
    .map(({ term }) => term)
    .slice(0, 5); // FIXME: arbitrary?

  // TODO: debug
  // console.log(terms)

  let matching = [];

  tfidf.tfidfs(terms, (_, measure, key) => {
    if (measure > 0) {
      matching.push({ file: key, measure });
    }
  });

  matching = chain(matching)
    .sortBy(({ measure }) => measure)
    .map(({ file }) => file)
    .value();

  console.log(matching.join("\n"));
};
