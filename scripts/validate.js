const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const exists = file => fs.existsSync(path.join(root, file));
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

const requiredFiles = [
  "index.html",
  "assets/styles.css",
  "assets/data.js",
  "assets/app.js",
  "assets/learning-map.svg",
  "assets/rag-flow.svg",
  "README.md"
];

requiredFiles.forEach(file => assert(exists(file), `缺少文件：${file}`));

const html = read("index.html");
const css = read("assets/styles.css");
const dataJs = read("assets/data.js");
const appJs = read("assets/app.js");

[
  "assets/styles.css",
  "assets/data.js",
  "assets/app.js",
  "assets/learning-map.svg",
  "assets/rag-flow.svg"
].forEach(ref => assert(html.includes(ref), `index.html 未引用：${ref}`));

[
  "tocList",
  "scoreRows",
  "jobTypes",
  "techAccordions",
  "quizBox",
  "flashCards",
  "costCalc",
  "qList",
  "checkList",
  "studyNote"
].forEach(id => assert(html.includes(`id="${id}"`), `缺少核心挂载点：#${id}`));

assert(css.includes("[data-motion=off]"), "缺少减少动效样式");
assert(css.includes(".calc.advanced"), "缺少高级成本计算器样式");
assert(appJs.includes("localStorage"), "app.js 未使用本地存储");
assert(appJs.includes("try {"), "app.js 缺少缓存容错逻辑");
assert(appJs.includes("aria-expanded"), "app.js 缺少可访问性状态同步");

const sandbox = { window: {} };
try {
  vm.runInNewContext(dataJs, sandbox, { filename: "assets/data.js" });
} catch (error) {
  errors.push(`data.js 语法错误：${error.message}`);
}

try {
  new vm.Script(appJs, { filename: "assets/app.js" });
} catch (error) {
  errors.push(`app.js 语法错误：${error.message}`);
}

const data = sandbox.window.AIPM_DATA;
assert(data && typeof data === "object", "AIPM_DATA 未正确导出");
if (data) {
  assert(Array.isArray(data.questions) && data.questions.length >= 15, "题库数量不足");
  assert(Array.isArray(data.checks) && data.checks.length === 12, "学习清单应为 12 项");
  assert(Array.isArray(data.nav) && data.nav.length >= 8, "目录模块数量不足");
  assert(Array.isArray(data.flash) && data.flash.length >= 8, "闪卡数量不足");
}

if (errors.length) {
  console.error("校验失败：");
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

console.log("校验通过：静态资源、数据结构和脚本语法正常。");
