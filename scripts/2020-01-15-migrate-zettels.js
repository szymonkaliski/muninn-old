const fs = require("fs");
const path = require("path");
const mkdirp = require("mkdirp");

const DIR = process.argv[2];

if (!DIR) {
  console.log("pass Muninn wiki directory as an argument");
}

const ZETTELS_DIR = path.join(DIR, "Zettels");
const OUTPUT_DIR = path.join(DIR, "Notes/Zettels");

mkdirp(OUTPUT_DIR);

const zettels = fs.readdirSync(ZETTELS_DIR).filter(f => f.endsWith(".md"));

const preprocessed = zettels.map(f => {
  const filepath = path.join(ZETTELS_DIR, f);
  const content = fs.readFileSync(filepath, "utf-8");

  const title = content.split("\n")[0];

  const filename =
    title
      .replace("# ", "")
      .toLowerCase()
      .replace(/"/g, "")
      .replace(/\(|\)/g, "")
      .replace(/\//g, "-") + ".md";

  return {
    oldFilename: f,
    newFilename: filename,

    oldPath: filepath,
    newPath: path.join(OUTPUT_DIR, filename),

    content
  };
});

const linkMap = preprocessed.reduce(
  (memo, { oldFilename, newFilename }) => ({
    ...memo,
    [oldFilename]: newFilename
  }),
  {}
);

// console.log(linkMap);

const updatedContent = preprocessed.map(d => {
  let newContent = d.content;

  Object.entries(linkMap).forEach(([key, value]) => {
    newContent = newContent.replace(key, value.replace(/\ /g, "\\ "));
  });

  return {
    ...d,
    content: newContent
  };
});

updatedContent.forEach(d => {
  console.log("saving:", d.newPath);
  fs.writeFileSync(d.newPath, d.content, "utf-8");
});
