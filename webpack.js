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

function parseModules(file) {
  const entry = getModuleInfo(file);
  const entries = [entry];
  const depsGraph = {};

  getDependencies(entries, entry);

  entries.forEach((info) => {
    depsGraph[info.file] = {
      deps: info.deps,
      code: info.code,
    };
  });

  return depsGraph;
}

function getDependencies(entries, { deps }) {
  Object.keys(deps).forEach((key) => {
    const child = getModuleInfo(deps[key]);
    entries.push(child);
    getDependencies(entries, child);
  });
}

function bundle(file) {
  const depsGraph = JSON.stringify(parseModules(file));
  return `(function (depsGraph) {
   function require(file) {
     function absoluteRequire(relativePath) {
       return require(depsGraph[file].deps[relativePath]);
     }
     var exports = {};
     (function (require, exports, code) {
       eval(code);
     })(absoluteRequire, exports, depsGraph[file].code)
     return exports;
   }
   require('${file}');
})(${depsGraph});`;
}

const content = bundle("./src/index.js");
!fs.existsSync("./dist") && fs.mkdirSync("./dist");
fs.writeFileSync("./dist/bundle.js", content);
