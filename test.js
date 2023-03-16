const fs = require("fs");

let text = fs.readFileSync("output.txt", "utf-8");
// to string
text = text.toString();

const startIndex = text.indexOf("What is claimed is:");
let result = text.slice(startIndex);

const endIndex = result.indexOf("Patent Citations");
result = result.slice(0, endIndex);
console.log(result);
