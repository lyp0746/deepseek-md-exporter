"""将 Turn 列表渲染为最终 Markdown 文件。

改进要点：
- user / assistant 独立编号，不再假设严格交替配对
- 即使只有思考过程没有正式回答也不丢
- 导出末尾附带统计摘要（用户消息数 / AI消息数 / 总轮次数）
- 支持自定义文件名（重命名）
- 导出后去重检测：与同目录已有文件比较首尾内容，避免重复导出
- 思考过程剥离工具：对已有 md 文件去除 <details> 思考块
"""
from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path

from .browser import ExportResult, Turn
from .converter import markdown_from_ds_markdown_html, markdown_from_plain_text


def _safe_filename(name: str) -> str:
    name = re.sub(r'[\\/:*?"<>|]', "_", name).strip()
    return name or "DeepSeek对话"


def render_markdown(result: ExportResult, include_think: bool = True) -> str:
    lines = [f"# {result.title}", ""]
    lines.append(f"> 导出时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("")
    lines.append("---")
    lines.append("")

    user_count = 0
    assistant_count = 0

    for turn in result.turns:
        if turn.role == "user":
            user_count += 1
            lines.append(f"## 🧑 提问 {user_count}")
            lines.append("")
            lines.append(markdown_from_plain_text(_strip_tags_simple(turn.text_html)))
            lines.append("")
        elif turn.role == "assistant":
            assistant_count += 1
            lines.append(f"## 🤖 回答 {assistant_count}")
            lines.append("")
            if include_think and turn.think_html.strip():
                think_md = markdown_from_ds_markdown_html(turn.think_html)
                lines.append("<details>")
                lines.append("<summary>💭 思考过程</summary>")
                lines.append("")
                lines.append(think_md)
                lines.append("")
                lines.append("</details>")
                lines.append("")
            if turn.main_html.strip():
                main_md = markdown_from_ds_markdown_html(turn.main_html)
                lines.append(main_md)
                lines.append("")
            elif not turn.think_html.strip():
                lines.append("*（内容为空）*")
                lines.append("")
        else:
            lines.append(f"## ❓ 未知角色：{turn.role}")
            lines.append("")

        lines.append("---")
        lines.append("")

    lines.append(f"> 📊 统计：用户消息 {user_count} 条 · AI 消息 {assistant_count} 条 · 总计 {user_count + assistant_count} 条")
    lines.append("")

    return "\n".join(lines).strip() + "\n"


def _strip_tags_simple(html: str) -> str:
    text = re.sub(r"<br\s*/?>", "\n", html)
    text = re.sub(r"<[^>]+>", "", text)
    import html as html_mod
    return html_mod.unescape(text).strip()


def save_markdown(
    result: ExportResult,
    out_dir: Path,
    include_think: bool = True,
    custom_name: str = "",
) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    if custom_name.strip():
        base = _safe_filename(custom_name.strip())
    else:
        base = _safe_filename(result.title)
    filename = base + ".md"
    path = out_dir / filename
    counter = 1
    while path.exists():
        path = out_dir / f"{base}_{counter}.md"
        counter += 1
    content = render_markdown(result, include_think=include_think)
    path.write_text(content, encoding="utf-8")
    return path


def check_duplicate(result: ExportResult, out_dir: Path, custom_name: str = "") -> Path | None:
    """检查导出目录中是否已存在内容高度相似的文件。

    比较策略：取新内容的标题行 + 首个提问 + 首个回答的前200字，
    与目录下所有 .md 文件对比。若相似度 > 80% 则认为重复，返回已有文件路径。
    """
    out_dir = Path(out_dir)
    if not out_dir.is_dir():
        return None

    new_title = result.title
    new_first_q = ""
    new_first_a = ""
    for t in result.turns:
        if t.role == "user" and not new_first_q:
            new_first_q = _strip_tags_simple(t.text_html)[:200]
        if t.role == "assistant" and not new_first_a:
            new_first_a = (t.main_html or t.think_html)[:200]
        if new_first_q and new_first_a:
            break

    new_sig = f"{new_title}\n{new_first_q}\n{new_first_a}"

    for existing in out_dir.glob("*.md"):
        try:
            text = existing.read_text(encoding="utf-8")
        except Exception:
            continue
        lines = text.splitlines()
        ex_title = ""
        ex_first_q = ""
        ex_first_a = ""
        in_first_q = False
        in_first_a = False
        buf = []
        for line in lines:
            if line.startswith("# ") and not ex_title:
                ex_title = line[2:].strip()
            if re.match(r"^## 🧑 提问", line) and not ex_first_q:
                in_first_q = True
                in_first_a = False
                buf = []
                continue
            if re.match(r"^## 🤖 回答", line) and not ex_first_a:
                in_first_a = True
                in_first_q = False
                if not ex_first_q:
                    ex_first_q = "\n".join(buf)[:200]
                buf = []
                continue
            if in_first_q or in_first_a:
                buf.append(line)
            if in_first_a and len(buf) >= 10:
                break
        if in_first_a and not ex_first_a:
            ex_first_a = "\n".join(buf)[:200]

        ex_sig = f"{ex_title}\n{ex_first_q}\n{ex_first_a}"
        if _similarity(new_sig, ex_sig) > 0.8:
            return existing

    return None


def _similarity(a: str, b: str) -> float:
    """简单的 Jaccard 字符级相似度。"""
    if not a or not b:
        return 0.0
    set_a = set(a)
    set_b = set(b)
    if not set_a and not set_b:
        return 1.0
    return len(set_a & set_b) / len(set_a | set_b)


def strip_thinking_from_file(path: Path) -> bool:
    """去除 md 文件中所有 <details> 思考过程块，原地修改。

    返回 True 表示有修改并已写入，False 表示无思考块。
    """
    try:
        text = path.read_text(encoding="utf-8")
    except Exception:
        return False

    cleaned = re.sub(
        r"<details>\s*<summary>💭 思考过程</summary>\s*.*?\s*</details>",
        "",
        text,
        flags=re.DOTALL,
    )
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip() + "\n"

    if cleaned == text:
        return False

    path.write_text(cleaned, encoding="utf-8")
    return True


def strip_thinking_from_dir(dir_path: Path) -> list[Path]:
    """批量去除目录下所有 .md 文件中的思考过程块。

    返回被修改的文件列表。
    """
    modified = []
    for p in dir_path.glob("*.md"):
        if strip_thinking_from_file(p):
            modified.append(p)
    return modified