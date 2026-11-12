// 验证用户可见的检索行为及阅读路径边界。
import test from "node:test";
import assert from "node:assert/strict";
import {
  filterEntries,
  resolveEntry,
  safeLocalPath,
} from "../assets/js/catalog-core.mjs";

const entries = [
  {
    id: "metrics",
    title: "分类指标",
    description: "理解混淆矩阵",
    category: "ai",
    tags: ["F1", "Recall"],
    path: "content/ai/classification_metrics_why_each_fixed.html",
  },
  {
    id: "attention",
    title: "Attention",
    description: "注意力机制",
    category: "ai",
    tags: ["Transformer"],
    path: "content/ai/attention.html",
  },
];

test("标题、摘要、标签均可搜索，忽略英文大小写和首尾空格", () => {
  for (const query of ["分类", "混淆矩阵", " f1 "]) {
    assert.deepEqual(
      filterEntries(entries, { query }).map((e) => e.id),
      ["metrics"],
    );
  }
});
test("多词检索要求全部词匹配，可组合分类与标签", () => {
  assert.equal(
    filterEntries(entries, {
      query: "分类 recall",
      category: "ai",
      tag: "F1",
    }).length,
    1,
  );
  assert.equal(
    filterEntries(entries, { query: "分类", category: "math" }).length,
    0,
  );
  assert.equal(filterEntries(entries, { query: "不存在" }).length, 0);
  assert.equal(filterEntries(entries, { category: "all" }).length, 2);
});
test("仅允许站内相对 HTML 路径，拒绝协议、穿越和编码绕过", () => {
  assert.equal(safeLocalPath(entries[0].path), true);
  assert.equal(safeLocalPath(entries[1].path), true);
  for (const path of [
    "https://example.com/a.html",
    "//example.com/a.html",
    "../a.html",
    "/a.html",
    "%2e%2e/a.html",
    "a\\b.html",
    "a.html?x=1",
    "javascript:alert(1)",
    "assets/image.png",
  ]) {
    assert.equal(safeLocalPath(path), false, path);
  }
});
test("阅读器只能解析目录中存在且路径有效的 ID", () => {
  assert.equal(resolveEntry(entries, "metrics"), entries[0]);
  assert.equal(resolveEntry(entries, "missing"), null);
  assert.equal(
    resolveEntry(
      [{ ...entries[0], path: "https://example.com/a.html" }],
      "metrics",
    ),
    null,
  );
});

test("顶层分类直接筛选文章，排除其他分类", () => {
  const mixed = [...entries, { ...entries[0], id: "python", category: "engineering" }];
  assert.deepEqual(filterEntries(mixed, { category: "ai" }).map(entry => entry.id), ["metrics", "attention"]);
  assert.deepEqual(filterEntries(mixed, { category: "ai", query: "F1" }).map(entry => entry.id), ["metrics"]);
});
