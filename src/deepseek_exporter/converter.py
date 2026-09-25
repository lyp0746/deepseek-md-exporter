"""HTML -> Markdown 转换器，专门适配 DeepSeek 网页导出内容。"""
from __future__ import annotations

import re
from html.parser import HTMLParser


class _Node:
    __slots__ = ("tag", "attrs", "children", "text")

    def __init__(self, tag: str = "", attrs: dict | None = None):
        self.tag = tag
        self.attrs = attrs or {}
        self.children: list["_Node"] = []
        self.text = ""


class _MiniHTMLParser(HTMLParser):
    VOID_TAGS = {"br", "img", "hr", "input", "meta", "link"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = _Node("root")
        self._stack = [self.root]

    def handle_starttag(self, tag, attrs):
        node = _Node(tag, dict(attrs))
        self._stack[-1].children.append(node)
        if tag not in self.VOID_TAGS:
            self._stack.append(node)

    def handle_startendtag(self, tag, attrs):
        node = _Node(tag, dict(attrs))
        self._stack[-1].children.append(node)

    def handle_endtag(self, tag):
        for i in range(len(self._stack) - 1, 0, -1):
            if self._stack[i].tag == tag:
                del self._stack[i:]
                break

    def handle_data(self, data):
        self._stack[-1].children.append(_text_node(data))


def _text_node(data: str) -> _Node:
    n = _Node("#text")
    n.text = data
    return n


def parse_html(html: str) -> _Node:
    p = _MiniHTMLParser()
    p.feed(html)
    return p.root


def _class_list(node: _Node) -> list[str]:
    return (node.attrs.get("class") or "").split()


def _find_all(node: _Node, predicate) -> list[_Node]:
    out = []
    for c in node.children:
        if predicate(c):
            out.append(c)
        out.extend(_find_all(c, predicate))
    return out


def _get_text(node: _Node) -> str:
    parts = []
    for c in node.children:
        if c.tag == "#text":
            parts.append(c.text)
        else:
            parts.append(_get_text(c))
    return "".join(parts)


def _get_katex_tex(node: _Node) -> str | None:
    annotations = _find_all(
        node,
        lambda n: n.tag == "annotation"
        and n.attrs.get("encoding") == "application/x-tex",
    )
    if annotations:
        return _get_text(annotations[0]).strip()
    return None


def _render_inline(node: _Node) -> str:
    out = []
    for c in node.children:
        if c.tag == "#text":
            out.append(c.text)
        elif c.tag in ("strong", "b"):
            out.append("**" + _render_inline(c) + "**")
        elif c.tag in ("em", "i"):
            out.append("*" + _render_inline(c) + "*")
        elif c.tag == "code":
            out.append("`" + _get_text(c) + "`")
        elif c.tag == "br":
            out.append("\n")
        elif c.tag == "a":
            href = c.attrs.get("href", "")
            out.append(f"[{_render_inline(c)}]({href})")
        elif c.tag == "span" and "katex" in _class_list(c):
            tex = _get_katex_tex(c)
            if tex is not None:
                out.append(f"${tex}$")
            else:
                out.append(_render_inline(c))
        else:
            out.append(_render_inline(c))
    return "".join(out)


def _is_block_katex(node: _Node) -> bool:
    return node.tag == "span" and "katex-display" in _class_list(node)


def _render_block(node: _Node, depth: int = 0) -> list[str]:
    lines: list[str] = []

    for c in node.children:
        cls = _class_list(c)
        tag = c.tag

        if tag == "#text":
            t = c.text.strip()
            if t:
                lines.append(t)
            continue

        if tag in ("p",) or "ds-markdown-paragraph" in cls:
            text = _render_inline(c).strip()
            if text:
                lines.append(text)
                lines.append("")
            continue

        if tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
            level = int(tag[1])
            lines.append("#" * level + " " + _render_inline(c).strip())
            lines.append("")
            continue

        if tag == "ul":
            lines.extend(_render_list(c, ordered=False, depth=depth))
            lines.append("")
            continue

        if tag == "ol":
            start = c.attrs.get("start")
            lines.extend(_render_list(c, ordered=True, depth=depth, start=int(start) if start else 1))
            lines.append("")
            continue

        if tag == "pre":
            code_node = next((x for x in c.children if x.tag == "code"), c)
            lang = ""
            for cl in _class_list(code_node):
                if cl.startswith("language-"):
                    lang = cl.replace("language-", "")
                    break
            code_text = _get_text(code_node)
            lines.append(f"```{lang}")
            lines.append(code_text.rstrip("\n"))
            lines.append("```")
            lines.append("")
            continue

        if tag == "table":
            lines.extend(_render_table(c))
            lines.append("")
            continue

        if _is_block_katex(c):
            tex = _get_katex_tex(c)
            if tex is not None:
                lines.append(f"$${tex}$$")
                lines.append("")
            continue

        if tag == "blockquote":
            inner = _render_block(c, depth)
            for l in inner:
                lines.append(("> " + l) if l else ">")
            lines.append("")
            continue

        lines.extend(_render_block(c, depth))

    return lines


def _render_list(node: _Node, ordered: bool, depth: int, start: int = 1) -> list[str]:
    lines = []
    idx = start
    indent = "  " * depth
    for li in node.children:
        if li.tag != "li":
            continue
        text_parts = []
        sub_lists: list[str] = []
        for c in li.children:
            if c.tag in ("ul", "ol"):
                if c.tag == "ul":
                    sub_lists.extend(_render_list(c, ordered=False, depth=depth + 1))
                else:
                    s = c.attrs.get("start")
                    sub_lists.extend(_render_list(c, ordered=True, depth=depth + 1, start=int(s) if s else 1))
            elif c.tag == "#text":
                if c.text.strip():
                    text_parts.append(c.text.strip())
            else:
                text_parts.append(_render_inline(c).strip() if c.tag != "p" else _render_inline(c).strip())
        marker = f"{idx}." if ordered else "-"
        lines.append(f"{indent}{marker} {' '.join(p for p in text_parts if p)}".rstrip())
        lines.extend(sub_lists)
        idx += 1
    return lines


def _render_table(node: _Node) -> list[str]:
    rows: list[list[str]] = []
    for section in node.children:
        if section.tag in ("thead", "tbody"):
            for tr in section.children:
                if tr.tag != "tr":
                    continue
                row = []
                for cell in tr.children:
                    if cell.tag in ("td", "th"):
                        row.append(_render_inline(cell).strip())
                if row:
                    rows.append(row)
        elif section.tag == "tr":
            row = []
            for cell in section.children:
                if cell.tag in ("td", "th"):
                    row.append(_render_inline(cell).strip())
            if row:
                rows.append(row)

    if not rows:
        return []

    lines = []
    header = rows[0]
    lines.append("| " + " | ".join(header) + " |")
    lines.append("| " + " | ".join(["---"] * len(header)) + " |")
    for row in rows[1:]:
        row = row + [""] * (len(header) - len(row))
        lines.append("| " + " | ".join(row[: len(header)]) + " |")
    return lines


def markdown_from_ds_markdown_html(html: str) -> str:
    root = parse_html(html)
    lines = _render_block(root)
    text = "\n".join(lines)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text


def markdown_from_plain_text(text: str) -> str:
    return text.strip()