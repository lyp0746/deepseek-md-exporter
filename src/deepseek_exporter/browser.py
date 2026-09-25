"""基于 Playwright 的 DeepSeek 网页对话抓取模块。

改进要点：
- 自动检测真实滚动容器（而非盲滚 mouse.wheel）
- 强制 scrollTop=0 回溯到最顶部，验证到达后才停止
- 逐屏向下滚动收集，基于 scrollTop/scrollHeight 精确判定到底
- 稳定性签名机制避免过早判定结束
"""
from __future__ import annotations

import os
import time
from dataclasses import dataclass, field
from pathlib import Path

from playwright.sync_api import sync_playwright, Page, BrowserContext

USER_DATA_DIR = Path.cwd() / ".deepseek_exporter" / "chrome_profile"


def ensure_browser_installed() -> str | None:
    browsers_path = os.environ.get("PLAYWRIGHT_BROWSERS_PATH", "")
    if not browsers_path:
        local_app = os.environ.get("LOCALAPPDATA", os.path.expanduser("~"))
        browsers_path = os.path.join(local_app, "ms-playwright")
    bp = Path(browsers_path)
    if not bp.exists():
        return f"浏览器目录不存在：{bp}\n请先运行：playwright install chromium"
    chromium_dirs = list(bp.glob("chromium-*"))
    if not chromium_dirs:
        return f"未找到 Chromium 浏览器：{bp}\n请先运行：playwright install chromium"
    return None

SEL_ITEM = "[data-virtual-list-item-key]"
SEL_USER_TEXT = ".fbb737a4 .ds-collapsible-text"
SEL_THINK_CONTENT = ".ds-think-content .ds-markdown"
SEL_MAIN_CONTENT = ".ds-markdown.ds-assistant-message-main-content"


@dataclass
class Turn:
    key: str
    role: str
    text_html: str = ""
    think_html: str = ""
    main_html: str = ""


@dataclass
class ExportResult:
    title: str
    turns: list[Turn] = field(default_factory=list)


class DeepSeekBrowser:
    def __init__(self, headless: bool = False):
        self.headless = headless
        self._pw = None
        self._context: BrowserContext | None = None

    def __enter__(self):
        USER_DATA_DIR.mkdir(parents=True, exist_ok=True)
        self._pw = sync_playwright().start()
        self._context = self._pw.chromium.launch_persistent_context(
            str(USER_DATA_DIR),
            headless=self.headless,
            viewport={"width": 1280, "height": 900},
        )
        return self

    def __exit__(self, exc_type, exc, tb):
        if self._context:
            self._context.close()
        if self._pw:
            self._pw.stop()

    def ensure_login(self, timeout_sec: int = 300) -> bool:
        page = self._context.new_page()
        page.goto("https://chat.deepseek.com/", wait_until="domcontentloaded")
        deadline = time.time() + timeout_sec
        logged_in = False
        while time.time() < deadline:
            try:
                if page.locator("textarea").first.count() > 0:
                    logged_in = True
                    break
            except Exception:
                pass
            time.sleep(1.5)
        page.close()
        return logged_in

    def export_conversation(
        self,
        url: str,
        include_think: bool = True,
        progress_cb=None,
    ) -> ExportResult:
        page = self._context.new_page()
        page.goto(url, wait_until="domcontentloaded")
        page.wait_for_selector(SEL_ITEM, timeout=30000)
        page.wait_for_timeout(1500)

        title = self._get_title(page)
        collected: dict[str, Turn] = {}

        scroll_selector = self._detect_scroll_container(page)
        if not scroll_selector:
            raise RuntimeError("未能定位聊天滚动容器，页面结构可能已变化")

        if progress_cb:
            progress_cb(f"已定位滚动容器：{scroll_selector}")

        self._scroll_to_top(page, scroll_selector, progress_cb)

        visited_bottom = False
        stable_rounds = 0
        last_signature = None
        last_count = 0

        while True:
            self._collect_visible_turns(page, collected, include_think)

            top_key, bottom_key, scroll_top, scroll_height, client_height = \
                self._get_view_state(page, scroll_selector)
            signature = (
                top_key, bottom_key, len(collected),
                round(scroll_top), round(scroll_height), round(client_height),
            )

            if progress_cb:
                progress_cb(
                    f"已收集 {len(collected)} 条消息 | "
                    f"可视首key={top_key} 尾key={bottom_key} | "
                    f"scrollTop={scroll_top:.0f}/{scroll_height:.0f}"
                )

            at_bottom = scroll_top + client_height >= scroll_height - 8

            if signature == last_signature and len(collected) == last_count:
                stable_rounds += 1
            else:
                stable_rounds = 0

            if at_bottom:
                if visited_bottom and stable_rounds >= 3:
                    break
                visited_bottom = True

            last_signature = signature
            last_count = len(collected)

            moved = self._scroll_down_one_page(page, scroll_selector)
            page.wait_for_timeout(500)

            if not moved and visited_bottom and stable_rounds >= 2:
                break

        self._collect_visible_turns(page, collected, include_think)
        page.close()

        ordered_keys = sorted(
            collected.keys(), key=lambda k: int(k) if k.isdigit() else k
        )
        turns = [collected[k] for k in ordered_keys]
        return ExportResult(title=title, turns=turns)

    def _get_title(self, page: Page) -> str:
        try:
            t = page.title()
            return t.replace(" - DeepSeek", "").strip() or "DeepSeek对话"
        except Exception:
            return "DeepSeek对话"

    def _detect_scroll_container(self, page: Page) -> str | None:
        return page.evaluate(
            """
            (itemSel) => {
                const item = document.querySelector(itemSel);
                if (!item) return null;

                let el = item.parentElement;
                while (el) {
                    const style = getComputedStyle(el);
                    const overflowY = style.overflowY;
                    const scrollable = (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay')
                        && el.scrollHeight > el.clientHeight + 20;
                    if (scrollable) {
                        if (!el.dataset.dsExporterScrollId) {
                            el.dataset.dsExporterScrollId = 'ds_exporter_scroll_container';
                        }
                        return '[data-ds-exporter-scroll-id="ds_exporter_scroll_container"]';
                    }
                    el = el.parentElement;
                }

                const se = document.scrollingElement || document.documentElement;
                if (se) {
                    if (!se.dataset.dsExporterScrollId) {
                        se.dataset.dsExporterScrollId = 'ds_exporter_scroll_container';
                    }
                    return '[data-ds-exporter-scroll-id="ds_exporter_scroll_container"]';
                }
                return null;
            }
            """,
            SEL_ITEM,
        )

    def _scroll_to_top(self, page: Page, scroll_selector: str, progress_cb=None):
        last_top = None
        stable = 0

        for i in range(80):
            state = page.evaluate(
                """
                (sel) => {
                    const el = document.querySelector(sel);
                    if (!el) return null;
                    el.scrollTop = 0;
                    return {
                        scrollTop: el.scrollTop,
                        firstKey: document.querySelector('[data-virtual-list-item-key]')
                            ?.getAttribute('data-virtual-list-item-key') || null
                    };
                }
                """,
                scroll_selector,
            )
            page.wait_for_timeout(250)

            current_top = state["scrollTop"] if state else None
            if progress_cb:
                progress_cb(f"回溯顶部中... 第{i+1}次, scrollTop={current_top}")

            if current_top == last_top == 0:
                stable += 1
            else:
                stable = 0
            last_top = current_top

            if stable >= 3:
                break

        for _ in range(8):
            page.evaluate(
                """
                (sel) => {
                    const el = document.querySelector(sel);
                    if (el) el.scrollTop = 0;
                }
                """,
                scroll_selector,
            )
            page.wait_for_timeout(200)

    def _scroll_down_one_page(self, page: Page, scroll_selector: str) -> bool:
        before = page.evaluate(
            """
            (sel) => {
                const el = document.querySelector(sel);
                if (!el) return null;
                return {
                    top: el.scrollTop,
                    step: Math.max(300, Math.floor(el.clientHeight * 0.8)),
                    clientHeight: el.clientHeight,
                    scrollHeight: el.scrollHeight
                };
            }
            """,
            scroll_selector,
        )
        if not before:
            return False

        page.evaluate(
            """
            ([sel, step]) => {
                const el = document.querySelector(sel);
                if (el) el.scrollTop = Math.min(el.scrollTop + step, el.scrollHeight);
            }
            """,
            [scroll_selector, before["step"]],
        )

        after = page.evaluate(
            """
            (sel) => {
                const el = document.querySelector(sel);
                if (!el) return null;
                return el.scrollTop;
            }
            """,
            scroll_selector,
        )

        return after is not None and after > before["top"]

    def _get_view_state(self, page: Page, scroll_selector: str):
        return page.evaluate(
            """
            ([itemSel, scrollSel]) => {
                const items = Array.from(document.querySelectorAll(itemSel));
                const scrollEl = document.querySelector(scrollSel);
                return [
                    items[0]?.getAttribute('data-virtual-list-item-key') || null,
                    items[items.length - 1]?.getAttribute('data-virtual-list-item-key') || null,
                    scrollEl?.scrollTop || 0,
                    scrollEl?.scrollHeight || 0,
                    scrollEl?.clientHeight || 0,
                ];
            }
            """,
            [SEL_ITEM, scroll_selector],
        )

    def _collect_visible_turns(self, page: Page, collected: dict[str, Turn], include_think: bool):
        items = page.evaluate(
            """
            (sel) => {
                return Array.from(document.querySelectorAll(sel)).map(n => ({
                    key: n.getAttribute('data-virtual-list-item-key'),
                    outerHTML: n.outerHTML
                }));
            }
            """,
            SEL_ITEM,
        )

        for item in items:
            key = item["key"]
            if not key:
                continue
            if key in collected:
                continue

            turn = self._parse_item_html(page, key, item["outerHTML"], include_think)
            if turn:
                collected[key] = turn

    def _parse_item_html(self, page: Page, key: str, outer_html: str, include_think: bool) -> Turn | None:
        result = page.evaluate(
            """
            ([html, selUserText, selThink, selMain]) => {
                const wrapper = document.createElement('div');
                wrapper.innerHTML = html;

                const userText = wrapper.querySelector(selUserText);
                const thinkEl = wrapper.querySelector(selThink);
                const mainEl = wrapper.querySelector(selMain);

                if (userText) {
                    return {
                        role: 'user',
                        text_html: userText.innerHTML
                    };
                }

                if (mainEl || thinkEl) {
                    return {
                        role: 'assistant',
                        think_html: thinkEl ? thinkEl.innerHTML : '',
                        main_html: mainEl ? mainEl.innerHTML : ''
                    };
                }

                return null;
            }
            """,
            [outer_html, SEL_USER_TEXT, SEL_THINK_CONTENT, SEL_MAIN_CONTENT],
        )

        if not result:
            return None

        if result["role"] == "user":
            return Turn(
                key=key,
                role="user",
                text_html=result.get("text_html", ""),
            )

        return Turn(
            key=key,
            role="assistant",
            think_html=result.get("think_html", "") if include_think else "",
            main_html=result.get("main_html", ""),
        )