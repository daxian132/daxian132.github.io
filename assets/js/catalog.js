import { filterEntries, loadCatalog } from "./catalog-core.mjs";

const $ = (id) => document.getElementById(id);
const state = { query: "", category: "all", tag: "", sort: "recent" };
let catalog;

// 使用文本节点渲染目录元数据，避免把文章标题当作 HTML 执行。
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function readLocation() {
  const params = new URLSearchParams(location.search);
  state.query = params.get("q") || "";
  const category = params.get("category");
  state.category =
    catalog.categories.some((item) => item.id === category)
      ? category
      : "all";
  state.tag = params.get("tag") || "";
  state.sort = params.get("sort") === "title" ? "title" : "recent";
  $("search").value = state.query;
  $("sort").value = state.sort;
}

function updateLocation() {
  const url = new URL(location.href);
  for (const [key, value] of Object.entries({
    q: state.query,
    category: state.category === "all" ? "" : state.category,
    tag: state.tag,
    sort: state.sort === "recent" ? "" : state.sort,
  })) {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  history.replaceState(null, "", url);
}

function selectCategory(id) {
  state.category = id;
  render();
}

function selectTag(tag) {
  state.tag = state.tag === tag ? "" : tag;
  render();
}

function categoryButton(id, name, count) {
  const button = element("button", "category-button");
  button.type = "button";
  button.dataset.category = id;
  button.append(
    element("span", "", name),
    element("span", "count", String(count).padStart(2, "0")),
  );
  button.addEventListener("click", () => selectCategory(id));
  return button;
}

function initializeSidebar() {
  const { entries, categories } = catalog;
  const activeCategories = categories.filter((category) =>
    entries.some((entry) => entry.category === category.id),
  );
  const tags = [...new Set(entries.flatMap((entry) => entry.tags))];
  $("total-count").textContent = String(entries.length).padStart(2, "0");
  $("category-count").textContent = String(activeCategories.length).padStart(
    2,
    "0",
  );
  $("tag-count").textContent = String(tags.length).padStart(2, "0");
  const list = $("category-list");
  list.replaceChildren(categoryButton("all", "全部手记", entries.length));
  for (const category of activeCategories) {
    list.append(
      categoryButton(
        category.id,
        category.name,
        entries.filter((entry) => entry.category === category.id).length,
      ),
    );
  }
  $("tag-list").replaceChildren(
    ...tags.map((tag) => {
      const button = element("button", "tag", tag);
      button.type = "button";
      button.dataset.tag = tag;
      button.addEventListener("click", () => selectTag(tag));
      return button;
    }),
  );
}

function entryCard(entry) {
  const card = element("article", "entry-card panel");
  const link = `reader.html?id=${encodeURIComponent(entry.id)}`;
  const main = element("div", "entry-main");
  const text = element("div", "entry-text");
  const topline = element("div", "entry-topline");
  const category = catalog.categories.find(
    (item) => item.id === entry.category,
  );
  topline.append(
    element("span", "entry-category", category?.name || "知识手记"),
  );
  if (entry.featured)
    topline.append(element("span", "entry-badge", "✦ 精选手记"));
  if (entry.type) topline.append(element("span", "entry-type", entry.type));
  const title = element("h3", "entry-title");
  const titleLink = element("a", "", entry.title);
  titleLink.href = link;
  title.append(titleLink);
  text.append(
    topline,
    title,
    element("p", "entry-description", entry.description),
  );
  main.append(text);
  if (entry.cover) {
    const cover = element("a", "entry-cover");
    cover.href = link;
    cover.tabIndex = -1;
    cover.setAttribute("aria-hidden", "true");
    const img = element("img");
    img.src = entry.cover;
    img.alt = "";
    img.width = 720;
    img.height = 520;
    img.loading = "lazy";
    cover.append(img);
    main.append(cover);
  } else {
    main.style.gridTemplateColumns = "1fr";
  }
  const footer = element("div", "entry-footer");
  const tags = element("div", "entry-tags");
  for (const tag of entry.tags) {
    const button = element("button", "entry-tag", tag);
    button.type = "button";
    button.setAttribute("aria-label", `筛选标签：${tag}`);
    button.dataset.entryTag = tag;
    button.dataset.entryId = entry.id;
    button.addEventListener("click", () => selectTag(tag));
    tags.append(button);
  }
  const read = element("a", "entry-read", "翻开这篇");
  read.href = link;
  read.setAttribute("aria-label", `阅读：${entry.title}`);
  const arrow = element("span", "", "→");
  arrow.setAttribute("aria-hidden", "true");
  read.append(arrow);
  footer.append(tags, read);
  card.append(main, footer);
  return card;
}

function renderFilters() {
  const filters = $("active-filters");
  filters.replaceChildren();
  const categoryName = catalog.categories.find((item) => item.id === state.category)?.name;
  for (const [key, label] of [
    ["category", categoryName],
    ["tag", state.tag],
  ]) {
    if (!label) continue;
    const chip = element("button", "filter-chip", label);
    chip.type = "button";
    chip.setAttribute(
      "aria-label",
      `清除${key === "tag" ? "标签" : "分类"}：${label}`,
    );
    chip.append(element("span", "", "×"));
    chip.addEventListener("click", () => {
      state[key] = key === "category" ? "all" : "";
      render();
    });
    filters.append(chip);
  }
  filters.hidden = !filters.childElementCount;
  document.querySelectorAll("[data-category]").forEach((button) => {
    const active = button.dataset.category === state.category;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelectorAll("[data-tag]").forEach((button) => {
    const active = button.dataset.tag === state.tag;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function render() {
  // 重绘前记录焦点；标签与筛选按钮被替换后恢复可操作的位置。
  const focused = document.activeElement;
  const focusedTag = focused?.dataset.entryTag;
  const focusedEntryId = focused?.dataset.entryId;
  const focusedChip = focused?.classList.contains("filter-chip");
  const entries = filterEntries(catalog.entries, state);
  entries.sort(
    state.sort === "title"
      ? (a, b) => a.title.localeCompare(b.title, "zh-CN")
      : (a, b) => (b.addedAt || "").localeCompare(a.addedAt || ""),
  );
  $("entry-list").replaceChildren(...entries.map(entryCard));
  $("entry-list").setAttribute("aria-busy", "false");
  $("result-label").textContent =
    `${state.query || state.tag || state.category !== "all" ? "找到" : "共"} ${entries.length} 篇手记`;
  $("empty-state").hidden = entries.length > 0;
  $("collection-end").hidden = entries.length === 0;
  renderFilters();
  updateLocation();
  if (focusedTag !== undefined) {
    const replacement = [...document.querySelectorAll("[data-entry-tag]")].find(
      (button) =>
        button.dataset.entryTag === focusedTag &&
        button.dataset.entryId === focusedEntryId,
    );
    (replacement || $("search")).focus({ preventScroll: true });
  } else if (focusedChip) {
    ($("active-filters").querySelector("button") || $("search")).focus({
      preventScroll: true,
    });
  }
}

$("search").addEventListener("input", (event) => {
  state.query = event.target.value;
  if (catalog) render();
});
document
  .querySelector(".search-form")
  .addEventListener("submit", (event) => event.preventDefault());
$("sort").addEventListener("change", (event) => {
  state.sort = event.target.value;
  if (catalog) render();
});
$("reset-filters").addEventListener("click", () => {
  Object.assign(state, { query: "", category: "all", tag: "" });
  $("search").value = "";
  render();
  $("search").focus();
});
// 斜杠快捷键只在非输入区域启用，避免干扰输入法和编辑操作。
document.addEventListener("keydown", (event) => {
  if (
    event.key === "/" &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.isComposing &&
    !event.target.closest("input, textarea, select, [contenteditable]")
  ) {
    event.preventDefault();
    $("search").focus();
  }
});
window.addEventListener("popstate", () => {
  if (catalog) {
    readLocation();
    render();
  }
});

try {
  catalog = await loadCatalog();
  // 保留目录载入前用户已经输入的查询。
  const earlyQuery = $("search").value;
  initializeSidebar();
  readLocation();
  if (earlyQuery) {
    state.query = earlyQuery;
    $("search").value = earlyQuery;
  }
  render();
} catch (error) {
  $("entry-list").setAttribute("aria-busy", "false");
  $("load-error").hidden = false;
  $("result-label").textContent = "目录暂时不可用";
  $("category-list").replaceChildren(
    element("p", "muted loading-copy", "请刷新页面重试"),
  );
  console.error("知识目录加载失败：", error);
}
