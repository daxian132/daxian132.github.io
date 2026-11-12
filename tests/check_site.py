"""检查静态 HTML 链接、目录元数据以及既有文章完整性。"""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import hashlib
import json
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.ids = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        for name in ('src', 'href'):
            if name in attrs:
                self.links.append(attrs[name])


data = json.loads((ROOT / 'data/entries.json').read_text())
categories = {item['id'] for item in data['categories']}
assert len(categories) == len(data['categories']), '重复分类 ID'
assert len({item['id'] for item in data['entries']}) == len(data['entries']), '重复文章 ID'
for entry in data['entries']:
    assert entry['category'] in categories, f"未知分类：{entry['category']}"
    assert re.fullmatch(r'(?:[a-zA-Z0-9_-]+/)*[a-zA-Z0-9_-]+\.html', entry['path']), entry['path']
    assert (ROOT / entry['path']).is_file(), entry['path']
    if entry.get('cover'):
        assert (ROOT / entry['cover']).is_file(), entry['cover']

pages = [*ROOT.glob('*.html'), *(ROOT / 'content').rglob('*.html')]
links = 0
for file in pages:
    parser = PageParser()
    parser.feed(file.read_text())
    assert len(parser.ids) == len(set(parser.ids)), f'重复元素 ID：{file.name}'
    for link in parser.links:
        url = urlsplit(link)
        if url.scheme or url.netloc or not url.path:
            continue
        target = ROOT / unquote(url.path).lstrip('/') if url.path.startswith('/') else file.parent / unquote(url.path)
        if target.is_dir():
            target = target / 'index.html'
        assert target.is_file(), f'资源缺失：{file.name} → {link}'
        links += 1

for file in (ROOT / 'assets/images').glob('*.svg'):
    ET.parse(file)

original = ROOT / 'content/ai/classification_metrics_why_each_fixed.html'
assert hashlib.sha256(original.read_bytes()).hexdigest() == 'f56883e06cc264848d5d65314ce72c3059bf9443e5327fa08480f6cc00ad6b10', '原始示例文件发生变化，请确认并更新基线'
print(f'PASS：{len(pages)} 个 HTML、{links} 条本地链接、{len(data["entries"])} 篇文章、SVG 与原文 SHA-256')
