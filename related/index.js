const { chain, intersection } = require("lodash");

module.exports = ({ tfidf, ...options }) => {
  const keyToIndex = key => tfidf.documents.findIndex(doc => doc.__key === key);
  const termsForFile = file =>
    tfidf.listTerms(keyToIndex(file)).map(({ term }) => term);

  const searchTerms = termsForFile(options.file)
    .filter(term => term.length > 3)
    .filter(term => isNaN(term))
    .slice(0, 20);

  let matching = [];

  tfidf.tfidfs(searchTerms, (_, measure, key) => {
    if (measure > 0) {
      const terms = termsForFile(key);
      const matchingTerms = intersection(terms, searchTerms);

      matching.push({
        file: key,
        measure,
        terms,
        matchingTerms
      });
    }
  });

  chain(matching)
    .uniqBy(({ file }) => file)
    .sortBy([
      ({ measure }) => measure,
      ({ matchingTerms }) => matchingTerms.length
    ])
    .filter(({ file }) => file !== options.file)
    .reverse()
    .forEach(({ file, matchingTerms }) => {
      console.log(`${file}: ${matchingTerms.join(", ")}`);
    })
    .value();
};
