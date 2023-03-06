const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const babel = require("@babel/core");

// find imports in a module
function getModuleInfo(file) {
  const body = fs.readFileSync(file, "utf-8");

  // AST: source code => objects => iterate
  const ast = parser.parse(body, {
    sourceType: "module",
  });

  const deps = {};
  traverse(ast, {
    ImportDeclaration({ node }) {
      const dirname = path.dirname(file);
      const abspath = "." + path.sep + path.join(dirname, node.source.value);
      deps[node.source.value] = abspath;
    },
  });

  // ES6 => ES5
  const { code } = babel.transformFromAst(ast, null, {
    presets: ["@babel/preset-env"],
  });
  const moduleInfo = { file, deps, code };
  return moduleInfo;
}

const info = getModuleInfo("./src/index.js");
console.log("info", info);
