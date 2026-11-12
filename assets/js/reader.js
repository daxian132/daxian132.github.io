import { loadCatalog, resolveEntry } from "./catalog-core.mjs";

const $ = (id) => document.getElementById(id);
const frame = $("article-frame");

function showError(message) {
  $("reader-title").textContent = "这篇手记暂时找不到";
  $("reader-description").textContent = "回到知识库，重新寻找想读的那一页。";
  $("reader-content").hidden = true;
  $("reader-error").hidden = false;
  $("reader-error-message").textContent = message;
  document.title = "未找到手记 · 晴空图书室";
}

$("focus-toggle").addEventListener("click", () => {
  const active = document.body.classList.toggle("focus-mode");
  $("focus-toggle").setAttribute("aria-pressed", String(active));
  $("focus-toggle").textContent = active ? "退出展开" : "展开阅读";
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && document.body.classList.contains("focus-mode"))
    $("focus-toggle").click();
});

try {
  const catalog = await loadCatalog();
  // URL 只携带 ID，实际文件地址必须来自维护好的目录。
  const entry = resolveEntry(
    catalog.entries,
    new URLSearchParams(location.search).get("id"),
  );
  if (!entry) {
    showError("链接可能不完整，或文章尚未收录。请返回知识库重新选择。");
  } else {
    const category = catalog.categories.find(
      (item) => item.id === entry.category,
    );
    document.title = `${entry.title} · 晴空图书室`;
    $("reader-title").textContent = entry.title;
    $("reader-description").textContent = entry.description;
    $("reader-category").textContent = category?.name || "知识手记";
    $("reader-category").href =
      `./?category=${encodeURIComponent(entry.category)}#library`;
    $("original-link").href = entry.path;
    $("reader-content").hidden = false;
    // 先确认资源存在，防止 iframe 把 404 页面误报为载入成功。
    const response = await fetch(entry.path, { method: "HEAD" });
    if (!response.ok) throw new Error("文章文件不存在");
    frame.title = entry.title;
    frame.addEventListener(
      "load",
      () => {
        $("reader-status").textContent = "交互手记 · 可直接操作";
      },
      { once: true },
    );
    frame.src = entry.path;
    frame.hidden = false;
  }
} catch (error) {
  showError("文章或目录暂时加载失败，请检查网络后刷新，或返回知识库。");
  console.error("手记加载失败：", error);
}
