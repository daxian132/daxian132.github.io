// DOM 集成验证：不启动浏览器，不把结果当作视觉验收。
const { JSDOM, VirtualConsole } = require("jsdom");
const fs = require("node:fs/promises");
const path = require("node:path");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const root = process.cwd();
const base = "http://127.0.0.1:8000/";
let checks = 0;
function check(value, message) {
  assert.ok(value, message);
  checks++;
  console.log("PASS", message);
}
async function loadPage(file, search, script, fetchOverride) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (error) => errors.push(error.message));
  const dom = new JSDOM(await fs.readFile(path.join(root, file), "utf8"), {
    url: base + file + search,
    runScripts: "outside-only",
    virtualConsole: vc,
    pretendToBeVisual: true,
  });
  const core = await import(
    pathToFileURL(path.join(root, "assets/js/catalog-core.mjs"))
  );
  const fetcher =
    fetchOverride ||
    ((input, options) =>
      fetch(new URL(input, dom.window.location.href), options));
  dom.window.fetch = fetcher;
  dom.window.catalogCore = {
    ...core,
    loadCatalog: async () => {
      const response = await fetcher(base + "data/entries.json");
      if (!response.ok) throw new Error("目录加载失败");
      return response.json();
    },
  };
  const code = (await fs.readFile(path.join(root, script), "utf8")).replace(
    /^import\s+\{([^}]+)\}\s+from\s+["'][^"']+["'];/,
    "const {$1} = window.catalogCore;",
  );
  await dom.window.eval(`(async () => { ${code}\n })()`);
  return { dom, win: dom.window, doc: dom.window.document, errors };
}
(async () => {
  const home = await loadPage("index.html", "", "assets/js/catalog.js");
  const { win, doc } = home;
  check(
    doc.querySelectorAll(".entry-card").length === 2,
    "首页展示两篇真实文章",
  );
  check(
    doc.querySelector("#total-count").textContent === "02",
    "统计数量来自目录",
  );
  check(
    !doc.querySelector('[data-category="deep-learning"]'),
    "无内容分类隐藏",
  );
  const search = doc.querySelector("#search");
  search.value = "recall";
  search.dispatchEvent(new win.Event("input"));
  check(doc.querySelectorAll(".entry-card").length === 1, "英文标签搜索匹配");
  check(win.location.search.includes("q=recall"), "搜索同步到可分享URL");
  search.value = "不存在的算法";
  search.dispatchEvent(new win.Event("input"));
  check(
    !doc.querySelector("#empty-state").hidden &&
      doc.querySelectorAll(".entry-card").length === 0,
    "无结果显示空状态",
  );
  doc.querySelector("#reset-filters").click();
  check(
    doc.querySelectorAll(".entry-card").length === 2 && search.value === "",
    "重置后恢复全部文章",
  );
  doc.querySelector('[data-category="ai"]').click();
  doc.querySelector('[data-tag="F1"]').click();
  check(
    doc.querySelectorAll(".filter-chip").length === 2 &&
      doc.querySelectorAll(".entry-card").length === 1,
    "分类与标签可叠加",
  );
  check(
    doc.querySelector('[data-tag="F1"]').getAttribute("aria-pressed") ===
      "true",
    "筛选状态对辅助技术可见",
  );
  doc.querySelector('[aria-label="清除标签：F1"]').click();
  check(!win.location.search.includes("tag="), "清除标签更新URL");
  const articleTag = doc.querySelector(".entry-tag");
  articleTag.focus();
  articleTag.click();
  check(
    doc.activeElement !== doc.body && doc.activeElement.isConnected,
    "文章标签筛选后保留键盘焦点",
  );
  const chip = doc.querySelector(".filter-chip");
  chip.focus();
  chip.click();
  check(
    doc.activeElement !== doc.body && doc.activeElement.isConnected,
    "移除筛选后恢复键盘焦点",
  );
  check(home.errors.length === 0, "首页无DOM运行错误");
  const linked = await loadPage(
    "index.html",
    "?q=Recall&category=ai&tag=F1",
    "assets/js/catalog.js",
  );
  check(
    linked.doc.querySelector("#search").value === "Recall" &&
      linked.doc.querySelectorAll(".entry-card").length === 1,
    "直接访问筛选链接可恢复状态",
  );
  const reader = await loadPage(
    "reader.html",
    "?id=classification-metrics",
    "assets/js/reader.js",
  );
  check(
    reader.doc.querySelector("#article-frame").getAttribute("src") ===
      "content/ai/classification_metrics_why_each_fixed.html",
    "阅读器载入正确HTML",
  );
  check(
    reader.doc.querySelector("#original-link").getAttribute("href") ===
      "content/ai/classification_metrics_why_each_fixed.html",
    "原文入口与iframe保持一致",
  );
  reader.doc.querySelector("#focus-toggle").click();
  check(reader.doc.body.classList.contains("focus-mode"), "展开阅读生效");
  reader.doc.dispatchEvent(
    new reader.win.KeyboardEvent("keydown", { key: "Escape" }),
  );
  check(!reader.doc.body.classList.contains("focus-mode"), "Escape退出展开");
  const biasReader = await loadPage(
    "reader.html", "?id=bias-variance-mse-gepa", "assets/js/reader.js"
  );
  check(biasReader.doc.querySelector("#article-frame").getAttribute("src") ===
    "content/ai/bias_variance_mse_gepa_guide_derivation_expanded.html",
    "Bias 笔记可通过目录载入阅读器");
  const missing = await loadPage(
    "reader.html",
    "?id=unknown",
    "assets/js/reader.js",
  );
  check(
    !missing.doc.querySelector("#reader-error").hidden &&
      !missing.doc.querySelector("#article-frame").getAttribute("src"),
    "未知ID不载入任意路径并显示错误",
  );
  const bad = await loadPage(
    "index.html",
    "",
    "assets/js/catalog.js",
    async () => ({ ok: false }),
  );
  check(!bad.doc.querySelector("#load-error").hidden, "目录失败有原文后备入口");
  const article = new JSDOM(
    await fs.readFile(
      path.join(root, "content/ai/classification_metrics_why_each_fixed.html"),
      "utf8",
    ),
    { runScripts: "dangerously" },
  );
  const ad = article.window.document;
  check(
    ad.querySelector("#score").textContent === "96.0%",
    "原页面初始Accuracy为96%",
  );
  ad.querySelector('[data-metric="precision"]').click();
  check(
    ad.querySelector("#score").textContent === "80.0%",
    "Precision指标切换正常",
  );
  ad.querySelector("#tp").value = "20";
  ad.querySelector("#tp").dispatchEvent(new article.window.Event("input"));
  check(
    ad.querySelector("#score").textContent === "50.0%",
    "输入改变后重新计算Precision",
  );
  ad.querySelector('[data-priority="both"]').click();
  check(
    ad.querySelector("#advice").textContent.includes("优先看 F1"),
    "业务目标切换正常",
  );
  for (const id of ["tp", "fp", "fn", "tn"])
    ad.querySelector("#" + id).value = "0";
  ad.querySelector("#tp").dispatchEvent(new article.window.Event("input"));
  check(ad.querySelector("#score").textContent === "—", "零分母显示未定义符号");
  for (const p of [home, linked, reader, biasReader, missing, bad]) p.win.close();
  article.window.close();
  console.log(`${checks} DOM checks passed (no visual layout tested)`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
