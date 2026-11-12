// 检索与路径解析独立于页面，供首页、阅读器和测试复用。
const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toLocaleLowerCase();

export function filterEntries(
  entries,
  { query = "", category = "all", tag = "" } = {},
) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return entries.filter((entry) => {
    const haystack = normalize(
      [entry.title, entry.description, ...entry.tags].join(" "),
    );
    const inCategory =
      category === "all" ||
      entry.category === category;
    return (
      inCategory &&
      (!tag ||
        entry.tags.some((value) => normalize(value) === normalize(tag))) &&
      words.every((word) => haystack.includes(word))
    );
  });
}

export function safeLocalPath(path) {
  return (
    typeof path === "string" &&
    /^(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.html$/.test(path)
  );
}

export function resolveEntry(entries, id) {
  return (
    entries.find((entry) => entry.id === id && safeLocalPath(entry.path)) ??
    null
  );
}

export async function loadCatalog() {
  const response = await fetch(
    new URL("../../data/entries.json", import.meta.url),
  );
  if (!response.ok) throw new Error("无法读取知识目录");
  const data = await response.json();
  if (!Array.isArray(data.entries) || !Array.isArray(data.categories))
    throw new Error("目录格式不正确");
  return data;
}
