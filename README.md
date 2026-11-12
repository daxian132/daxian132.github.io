# 晴空图书室 · 大仙的知识手记

天空系二次元风格的个人算法知识站，使用 HTML、CSS 和原生 JavaScript。现有独立 HTML 可直接接入，不需要转换成 Markdown。运行和 GitHub Pages 部署无需安装依赖或构建。

## 本地预览

在仓库根目录运行：

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

打开 <http://127.0.0.1:8000/>。首页需要通过 HTTP 读取目录 JSON，请使用本地服务预览。

## 添加一篇 HTML

1. 将文章和其独有资源放到对应分类。例如：

   ```text
   content/ai/attention/
   ├── index.html
   └── assets/
       └── diagram.png
   ```

2. 在 `data/entries.json` 的 `entries` 数组中添加记录：

   ```json
   {
     "id": "attention",
     "title": "Attention：理解注意力机制",
     "description": "文章的简短介绍，用于列表展示和搜索。",
     "category": "ai",
     "tags": ["Attention", "Transformer"],
     "type": "原理推导",
     "path": "content/ai/attention/index.html",
     "addedAt": "2026-11-12",
     "featured": false
   }
   ```

   上面仅为文档示例，未加入网站目录。`id` 必须唯一，`addedAt` 填实际收录日期。`cover` 可选，填写仓库内封面路径；没有封面时卡片自动采用纯文本布局。

3. 本地检查后提交、推送到 GitHub。文章内部的图片、脚本等使用相对路径，并随文章一起提交。

`path` 使用相对根目录的 ASCII 路径，只允许字母、数字、下划线、短横线、斜杠和 `.html` 后缀。中文标题写在 `title` 中，文件名使用英文短名。不要填本机绝对路径或外部网址。

文章在站内阅读器中通过 iframe 独立加载，保留自身样式和脚本；也可使用“打开原页”直接访问。阅读器面向自己维护的可信 HTML，不是运行不可信代码的沙箱。

## 分类

只保留五个顶层分类，直接在其中放 HTML，不设置分类子目录：

```text
content/
├── ai/             人工智能
├── algorithms/     基础算法
├── engineering/    工程实践
├── math/           数学基础
└── tools/          工具与环境
```

目录记录的 `category` 分别使用 `ai`、`algorithms`、`engineering`、`math`、`tools`。具体算法通过文章标题和标签区分，没有文章的分类在首页自动隐藏。

分类指标笔记现位于 `content/ai/classification_metrics_why_each_fixed.html`。站内阅读入口仍为 `reader.html?id=classification-metrics`。

Bias 笔记位于 `content/ai/bias_variance_mse_gepa_guide_derivation_expanded.html`，阅读入口为 `reader.html?id=bias-variance-mse-gepa`。文章自包含，直接打开 HTML 也可操作实验。

## 文件结构

```text
index.html                    首页与检索
reader.html                   站内阅读
404.html                      未找到页面
data/entries.json             分类与文章目录
assets/css/site.css           门户与阅读外框样式
assets/js/catalog-core.mjs    检索与路径解析
assets/js/catalog.js          首页交互
assets/js/reader.js           阅读器交互
assets/images/                插画、图标和封面
tests/                        功能与资源检查
```

## GitHub Pages

此仓库针对用户站点 `daxian132.github.io`，站点从仓库根目录发布。

在 GitHub 仓库 Settings → Pages 中选择 **Deploy from a branch → main → / (root)**，保存后由 GitHub 完成发布。`.nojekyll` 用于直接发布静态文件。若远端已经配置了自定义 Actions，应保留原发布方式并确认上传的是这些静态文件。

发布源使用 `main` 分支的仓库根目录，站点地址为 <https://daxian132.github.io/>。实际发布状态可在仓库 Settings → Pages 和 Actions 中查看。`404.html` 的资源使用用户站根路径；若未来改为带仓库子路径的项目站，需要相应调整 404 资源和首页链接。

## 功能检查

无需依赖的核心检索测试及静态资源检查：

```bash
node --test tests/catalog.test.mjs
python3 tests/check_site.py
```

可选 DOM 集成测试（建议 Node.js 24；jsdom 支持 20.19+、22.13+ 或 24+，另一个终端保持预览服务运行）：

```bash
npm ci
npm run test:dom
npm run test:bias
```

jsdom 仅用于开发测试，网站运行不依赖 npm。DOM 测试覆盖筛选、空状态、键盘焦点、阅读器以及原页面计算；不验证浏览器布局和图片裁切。

## 视觉资源

首页插画使用内置 imagegen 工具原创生成并保存到 `assets/images/sky-library.png`。完整提示词见 [插画记录](assets/images/README.md)。矩阵封面与站点图标为本站 SVG，网站不依赖外链图片或在线字体。
