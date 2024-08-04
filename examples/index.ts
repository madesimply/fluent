import fs from "fs";

const exampleName = process.argv[2];
const directories = fs
  .readdirSync(__dirname)
  .filter((file) => fs.lstatSync(`${__dirname}/${file}`).isDirectory());

if (!directories.includes(exampleName)) {
  console.error(`Example ${exampleName} not found`);
  process.exit(1);
}

// import the example
import(`./${exampleName}/index.ts`);
