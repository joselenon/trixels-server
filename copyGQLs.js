/* eslint-disable @typescript-eslint/no-var-requires */

const fs = require('fs-extra');
const path = require('path');

const sourceDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'build');

const copyFiles = (sourceDir, distDir, fileExtension) => {
  fs.readdirSync(sourceDir).forEach((file) => {
    const sourceFile = path.join(sourceDir, file);
    const distFile = path.join(distDir, file);

    const stat = fs.statSync(sourceFile);
    if (stat.isDirectory()) {
      copyFiles(sourceFile, distFile, fileExtension);
    } else if (path.extname(file) === fileExtension) {
      fs.copySync(sourceFile, distFile, { overwrite: true });
    }
  });
};

copyFiles(sourceDir, distDir, '.gql');
