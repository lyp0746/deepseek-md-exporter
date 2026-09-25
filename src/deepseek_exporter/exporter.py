"""将 Turn 列表渲染为最终 Markdown 文件。

改进要点：
- user / assistant 独立编号，不再假设严格交替配对
- 即使只有思考过程没有正式回答也不丢
- 导出末尾附带统计摘要（用户消息数 / AI消息数 / 总轮次数）
- 支持自定义文件名（重命名）
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