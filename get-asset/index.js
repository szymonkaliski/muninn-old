const fs = require("fs");
const md5 = require("md5");
const mkdirp = require("mkdirp");
const path = require("path");
const wget = require("node-wget");

module.exports = options => {
  const assetDir = path.join(path.dirname(options.file), ".assets");
  const ext = path.extname(options.url);

  mkdirp.sync(assetDir);

  const shouldDownload = options.url.startsWith("http");

  if (shouldDownload) {
    const tempName = path.join(assetDir, "download.temp");

    wget({ url: options.url, dest: tempName }, (error, result, body) => {
      if (error) {
        console.log(error);
        process.exit(1);
      }

      const hash = md5(body);
      const finalName = `${hash}${ext}`;
      fs.renameSync(tempName, path.join(assetDir, finalName));

      console.log(`![](.assets/${finalName})
[(source)](${options.url})`);
    });
  } else {
    const hash = md5(fs.readFileSync(options.url));
    const finalName = `${hash}${ext}`;

    fs.copyFileSync(options.url, path.join(assetDir, finalName));

    console.log(`![](.assets/${finalName})`);
  }
};
