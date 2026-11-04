"""Read saved HTML as inert study content; never run scripts or load resources."""
from html.parser import HTMLParser
from pathlib import Path
import re

from presentation_text import plain_text

VERSION = 2
IGNORED = {'head', 'script', 'style', 'template', 'noscript', 'iframe', 'object', 'embed', 'svg', 'canvas', 'form', 'button', 'input', 'nav'}
BLOCK = {'p', 'div', 'section', 'article', 'main', 'header', 'footer', 'blockquote', 'figure', 'figcaption', 'address'}
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}


class Node:
    def __init__(self, tag='', attrs=()):
        self.tag, self.attrs, self.children = tag, dict(attrs), []


class Document(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node()
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        # Recover the common omitted end tags without merging adjacent questions.
        if tag in {'p', 'li', 'tr', 'td', 'th'} and self.stack[-1].tag == tag:
            self.stack.pop()
        node = Node(tag, attrs)
        self.stack[-1].children.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                self.stack = self.stack[:index]
                return

    def handle_data(self, value):
        self.stack[-1].children.append(value)


def hidden(node):
    return node.tag in IGNORED or 'hidden' in node.attrs or re.search(r'(?:display\s*:\s*none|visibility\s*:\s*hidden)', node.attrs.get('style', ''), re.I)


def raw_text(node):
    if isinstance(node, str): return node
    if hidden(node): return ''
    if node.tag == 'br': return '\n'
    return ''.join(raw_text(child) for child in node.children) + ('\n' if node.tag in BLOCK | {'li', 'tr'} else '')


def clean(value):
    return '\n'.join(re.sub(r'[^\S\n]+', ' ', line).strip() for line in value.replace('\xa0', ' ').splitlines()).strip()


def blocks(node, styles):
    if isinstance(node, str):
        value = clean(node)
        return [{'kind': 'paragraph', 'text': value}] if value else []
    if hidden(node): return []
    value = clean(raw_text(node))
    if not value: return []
    if node.tag == 'table':
        def rows(current):
            for child in current.children:
                if not isinstance(child, Node): continue
                if child.tag == 'tr': yield child
                elif child.tag != 'table': yield from rows(child)
        table = []
        for row in rows(node):
            cells = []
            for cell in row.children:
                if isinstance(cell, Node) and cell.tag in {'td', 'th'}:
                    def span(name):
                        try: return max(1, min(100, int(cell.attrs.get(name, '1'))))
                        except ValueError: return 1
                    cells.append({'text': clean(raw_text(cell)), 'header': cell.tag == 'th', 'colSpan': span('colspan'), 'rowSpan': span('rowspan')})
            if cells: table.append(cells)
        return [{'kind': 'table', 'rows': table}] if table else [{'kind': 'paragraph', 'text': value}]
    if node.tag in {'ul', 'ol'}:
        items = [clean(raw_text(child)) for child in node.children if isinstance(child, Node) and child.tag == 'li']
        try: start = int(node.attrs.get('start', '1'))
        except ValueError: start = 1
        return [{'kind': 'list', 'ordered': node.tag == 'ol', 'start': start, 'items': items}]
    if node.tag == 'pre': return [{'kind': 'pre', 'text': raw_text(node).strip('\n')}]
    if re.fullmatch('h[1-6]', node.tag): return [{'kind': 'heading', 'text': value, 'level': min(4, int(node.tag[1]) + 1)}]
    # Google Docs/PDF exports often use styled spans instead of semantic headings.
    if node.tag == 'p':
        spans = [child for child in node.children if isinstance(child, Node) and clean(raw_text(child))]
        def properties(child):
            return ';'.join(styles.get(c, '') for c in child.attrs.get('class', '').split()) + ';' + child.attrs.get('style', '')
        bold = bool(spans) and all(re.search(r'font-weight\s*:\s*(?:bold|[6-9]00)', properties(s)) or s.tag in {'b', 'strong'} for s in spans)
        return [{'kind': 'heading' if bold and len(value) < 160 else 'paragraph', 'text': value, **({'level': 3} if bold and len(value) < 160 else {})}]
    if not any(isinstance(c, Node) and c.tag in BLOCK | {'html', 'body', 'table', 'ul', 'ol', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'} for c in node.children):
        return [{'kind': 'paragraph', 'text': value}]
    result, inline = [], []
    for child in node.children:
        if isinstance(child, str) or child.tag not in BLOCK | {'table', 'ul', 'ol', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'body', 'html'}:
            inline.append(raw_text(child)); continue
        if clean(''.join(inline)): result.append({'kind': 'paragraph', 'text': clean(''.join(inline))})
        inline = []
        result.extend(blocks(child, styles))
    if clean(''.join(inline)): result.append({'kind': 'paragraph', 'text': clean(''.join(inline))})
    return result


def block_text(block):
    if block['kind'] == 'table': return '\n'.join('\t'.join(c['text'] for c in row) for row in block['rows'])
    if block['kind'] == 'list': return '\n'.join((str(block['start'] + i) + '. ' if block['ordered'] else '• ') + item for i, item in enumerate(block['items']))
    return block['text']


def html_text(source: Path, sha: str):
    content = plain_text(source)
    parser = Document(); parser.feed(content); parser.close()
    styles = dict(re.findall(r'\.([\w-]+)\s*\{([^{}]*)\}', '\n'.join(re.findall(r'<style\b[^>]*>(.*?)</style>', content, re.I | re.S))))
    entries = blocks(parser.root, styles)
    pages, current = [], []
    # Keep actual task headings navigable, including exported inline “Task 1”.
    for block in entries:
        value = block_text(block)
        task = re.search(r'\bTask\s+\d+\b', value, re.I) if len(value) < 120 else None
        if task and current:
            pages.append(current); current = []
        current.append(block)
    if current: pages.append(current)
    result = {'sourceSha256': sha, 'htmlExtractionVersion': VERSION, 'pages': []}
    for index, page in enumerate(pages):
        text = '\n\n'.join(block_text(block) for block in page)
        result['pages'].append({'number': index + 1, 'text': text, 'extraction': 'html', 'blocks': page})
    result['text'] = '\n\f\n'.join(page['text'] for page in result['pages'])
    # Broken font encodings cannot be repaired by changing spacing. Do not promote
    # these glyphs to questions or answers; retain the original for comparison.
    suspicious = len(re.findall(r'[\u0460-\u052f]', result['text'])) > 15
    if suspicious:
        result['notice'] = 'This saved HTML has damaged character encoding. Its wording needs checking against the original; questions and answers have not been extracted from it.'
        for page in result['pages']: page.update(needsReview=True, questionExtractionBlocked=True)
    elif not result['text'].strip():
        result['notice'] = 'This saved HTML contains no readable study text. It may be an application shell or require a separate document. The original file is still available.'
    return result
