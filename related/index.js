const { chain, intersection } = require("lodash");

module.exports = ({ tfidf, ...options }) => {
  const keyToIndex = key => tfidf.documents.findIndex(doc => doc.__key === key);
  const termsForFile = file =>
    tfidf.listTerms(keyToIndex(file)).map(({ term }) => term);

  const searchTerms = termsForFile(options.file)
    .filter(term => term.length > 3)
    .filter(term => isNaN(term));

  let matching = {};

  tfidf.tfidfs(searchTerms, (_, measure, key) => {
    if (measure > 0) {
      const terms = termsForFile(key);
      const matchingTerms = intersection(terms, searchTerms);

      if (!matching[key]) {
        matching[key] = {
          file: key,
          measure,
          matchingTerms
        };
      } else {
        matching[key].measure = Math.max(matching[key].measure, measure);
      }
    }
  });

  chain(matching)
    .values()
    .filter(({ file }) => file !== options.file)
    .uniqBy(({ file }) => file)
    .sortBy([
      ({ matchingTerms }) => matchingTerms.length,
      ({ measure }) => measure
    ])
    .reverse()
    .forEach(({ file, matchingTerms }) => {
      console.log(`${file}: ${matchingTerms.join(", ")}`);
    })
    .value();
};
