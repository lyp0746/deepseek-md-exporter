"""ttk 图形界面 — VSCode Dark 风格，自定义图标。

图标策略：
- 窗口标题栏 + 任务栏：icon.png → .ico（Pillow 运行时转换）
- 头部 Logo：icon.png 缩放 32×32
- 按钮图标：icon.png 缩放 18×18
- 标签页图标：icon.png 缩放 16×16
"""
from __future__ import annotations

import queue
import sys
import tempfile
import threading
import tkinter as tk
from pathlib import Path
from tkinter import ttk, filedialog, messagebox

from PIL import Image, ImageTk

from .browser import DeepSeekBrowser, ensure_browser_installed
from .exporter import save_markdown

DEFAULT_OUT_DIR = Path(r"D:\0_Note\raw")

BG = "#1e1e1e"
BG_INPUT = "#3c3c3c"
BG_SIDEBAR = "#2d2d2d"
FG = "#d4d4d4"
FG_DIM = "#808080"
FG_ACCENT = "#569cd6"
FG_GREEN = "#6a9955"
FG_YELLOW = "#dcdcaa"
BORDER = "#3c3c3c"
ACCENT = "#0078d4"
ACCENT_HOVER = "#1a8cdb"
SELECTION = "#264f78"


def _find_icon_path() -> Path | None:
    if getattr(sys, "_MEIPASS", None):
        p = Path(sys._MEIPASS) / "icon.png"
        if p.exists():
            return p
    p = Path(__file__).resolve().parent.parent.parent / "icon.png"
    if p.exists():
        return p
    p = Path.cwd() / "icon.png"
    if p.exists():
        return p
    return None


class IconManager:
    def __init__(self, tk_root: tk.Tk):
        self._root = tk_root
        self._source: Image.Image | None = None
        self.logo: ImageTk.PhotoImage | None = None
        self.btn_icon: ImageTk.PhotoImage | None = None
        self.tab_icon: ImageTk.PhotoImage | None = None
        self._ico_path: str | None = None
        self._load()

    def _load(self):
        icon_path = _find_icon_path()
        if not icon_path:
            return
        try:
            self._source = Image.open(icon_path).convert("RGBA")
        except Exception:
            return

        self.logo = ImageTk.PhotoImage(self._source.resize((32, 32), Image.LANCZOS))
        self.btn_icon = ImageTk.PhotoImage(self._source.resize((18, 18), Image.LANCZOS))
        self.tab_icon = ImageTk.PhotoImage(self._source.resize((16, 16), Image.LANCZOS))

        try:
            ico_path = Path(tempfile.gettempdir()) / "deepseek_exporter.ico"
            self._source.save(
                str(ico_path),
                format="ICO",
                sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
            )
            self._ico_path = str(ico_path)
        except Exception:
            pass

    def apply_window_icon(self, root: tk.Tk):
        if self._ico_path:
            try:
                root.iconbitmap(self._ico_path)
                return
            except Exception:
                pass
        if self.logo:
            try:
                root.iconphoto(True, self.logo)
            except Exception:
                pass

    @property
    def ico_path_for_spec(self) -> str | None:
        return self._ico_path


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("DeepSeek 对话导出工具")
        self.geometry("800x600")
        self.minsize(680, 500)
        self.configure(bg=BG)

        self._icons = IconManager(self)
        self._icons.apply_window_icon(self)

        self._msg_queue: "queue.Queue[tuple[str, str]]" = queue.Queue()
        self._out_dir = tk.StringVar(value=str(DEFAULT_OUT_DIR))
        self._custom_name = tk.StringVar(value="")
        self._include_think = tk.BooleanVar(value=False)
        self._headless = tk.BooleanVar(value=False)
        self._worker_thread: threading.Thread | None = None

        self._apply_dark_theme()
        self._build_ui()
        self.after(200, self._poll_queue)

    def _apply_dark_theme(self):
        style = ttk.Style(self)
        try:
            style.theme_use("clam")
        except tk.TclError:
            style.theme_use(style.theme_names()[0])

        style.configure(".", background=BG, foreground=FG, borderwidth=0, relief="flat")
        style.configure("TFrame", background=BG)
        style.configure("TLabel", background=BG, foreground=FG, font=("Segoe UI", 10))
        style.configure("Header.TLabel", background=BG, foreground=FG_ACCENT, font=("Segoe UI", 16, "bold"))
        style.configure("Sub.TLabel", background=BG, foreground=FG_DIM, font=("Segoe UI", 9))
        style.configure("Green.TLabel", background=BG, foreground=FG_GREEN, font=("Segoe UI", 9))
        style.configure("TButton", background=BG_INPUT, foreground=FG, font=("Segoe UI", 10), padding=(12, 6), relief="flat", borderwidth=0)
        style.map("TButton", background=[("active", BG_SIDEBAR), ("pressed", ACCENT)])
        style.configure("Accent.TButton", background=ACCENT, foreground="#ffffff", font=("Segoe UI", 10, "bold"), padding=(16, 8), relief="flat")
        style.map("Accent.TButton", background=[("active", ACCENT_HOVER), ("pressed", "#005a9e")])
        style.configure("Icon.TButton", background=BG_INPUT, foreground=FG, font=("Segoe UI", 10), padding=(8, 4), relief="flat", borderwidth=0)
        style.map("Icon.TButton", background=[("active", BG_SIDEBAR), ("pressed", ACCENT)])
        style.configure("AccentIcon.TButton", background=ACCENT, foreground="#ffffff", font=("Segoe UI", 10, "bold"), padding=(12, 6), relief="flat")
        style.map("AccentIcon.TButton", background=[("active", ACCENT_HOVER), ("pressed", "#005a9e")])
        style.configure("TEntry", fieldbackground=BG_INPUT, foreground=FG, insertcolor=FG, borderwidth=1, relief="solid")
        style.map("TEntry", fieldbackground=[("focus", "#4a4a4a")], bordercolor=[("focus", ACCENT)])
        style.configure("TCheckbutton", background=BG, foreground=FG, font=("Segoe UI", 9), indicatorcolor=BG_INPUT)
        style.map("TCheckbutton", indicatorcolor=[("selected", ACCENT)], background=[("active", BG)])
        style.configure("TLabelframe", background=BG, foreground=FG_YELLOW, borderwidth=1, relief="solid")
        style.configure("TLabelframe.Label", background=BG, foreground=FG_YELLOW, font=("Segoe UI", 10, "bold"))
        style.configure("TNotebook", background=BG, borderwidth=0)
        style.configure("TNotebook.Tab", background=BG_SIDEBAR, foreground=FG_DIM, padding=(16, 8), font=("Segoe UI", 10))
        style.map("TNotebook.Tab", background=[("selected", BG)], foreground=[("selected", FG_ACCENT)], expand=[("selected", [0, 0, 0, 2])])
        style.configure("TProgressbar", background=ACCENT, troughcolor=BG_INPUT, borderwidth=0, thickness=6)
        style.configure("Horizontal.TScrollbar", background=BG_SIDEBAR, troughcolor=BG, borderwidth=0, arrowsize=13)
        style.map("Horizontal.TScrollbar", background=[("active", BG_INPUT)])

    def _build_ui(self):
        outer = ttk.Frame(self, padding=16)
        outer.pack(fill="both", expand=True)

        header = ttk.Frame(outer)
        header.pack(fill="x", pady=(0, 4))

        if self._icons.logo:
            logo_label = ttk.Label(header, image=self._icons.logo)
            logo_label.pack(side="left", padx=(0, 8))
            ttk.Label(header, text="深寻全录", style="Header.TLabel").pack(side="left")
        else:
            ttk.Label(header, text="深寻全录", style="Header.TLabel").pack(side="left")

        ttk.Label(header, text="  完整导出全部轮次为 Markdown", style="Sub.TLabel").pack(side="left", padx=(12, 0))

        sep1 = tk.Frame(outer, height=1, bg=BORDER)
        sep1.pack(fill="x", pady=(4, 8))

        notebook = ttk.Notebook(outer)
        notebook.pack(fill="both", expand=True, pady=(0, 4))

        main_tab = ttk.Frame(notebook, padding=12)
        settings_tab = ttk.Frame(notebook, padding=12)

        if self._icons.tab_icon:
            notebook.add(main_tab, text="  导出  ", image=self._icons.tab_icon, compound="left")
            notebook.add(settings_tab, text="  设置  ", image=self._icons.tab_icon, compound="left")
        else:
            notebook.add(main_tab, text="  导出  ")
            notebook.add(settings_tab, text="  设置  ")

        self._build_main_tab(main_tab)
        self._build_settings_tab(settings_tab)

        sep2 = tk.Frame(outer, height=1, bg=BORDER)
        sep2.pack(fill="x", pady=(4, 0))

        status_frame = ttk.Frame(outer)
        status_frame.pack(fill="x", pady=(6, 0))
        if self._icons.btn_icon:
            ttk.Label(status_frame, image=self._icons.btn_icon).pack(side="left", padx=(0, 6))
        self._status_var = tk.StringVar(value="就绪")
        ttk.Label(status_frame, textvariable=self._status_var, style="Green.TLabel").pack(side="left")

    def _build_main_tab(self, parent: ttk.Frame):
        login_frame = ttk.LabelFrame(parent, text="① 登录 DeepSeek", padding=10)
        login_frame.pack(fill="x", pady=(0, 8))

        if self._icons.btn_icon:
            login_btn = ttk.Button(
                login_frame, text="打开浏览器登录", image=self._icons.btn_icon,
                compound="left", style="Icon.TButton", command=self._on_login,
            )
        else:
            login_btn = ttk.Button(login_frame, text="打开浏览器登录", command=self._on_login)
        login_btn.pack(side="left")

        ttk.Label(
            login_frame,
            text="  首次使用请在弹出的浏览器中手动登录，登录状态会保存在本地",
            style="Sub.TLabel",
        ).pack(side="left", padx=(12, 0))

        url_frame = ttk.LabelFrame(parent, text="② 粘贴对话链接（每行一个，支持批量）", padding=10)
        url_frame.pack(fill="x", pady=(0, 8))
        self.url_text = tk.Text(
            url_frame, height=4, font=("Consolas", 10), wrap="none",
            bg=BG_INPUT, fg=FG, insertbackground=FG,
            selectbackground=SELECTION, selectforeground="#ffffff",
            relief="flat", borderwidth=1, highlightthickness=1,
            highlightcolor=ACCENT, highlightbackground=BORDER,
        )
        url_scroll = ttk.Scrollbar(url_frame, command=self.url_text.yview)
        self.url_text.configure(yscrollcommand=url_scroll.set)
        self.url_text.pack(side="left", fill="both", expand=True)
        url_scroll.pack(side="right", fill="y")
        self.url_text.insert("1.0", "")

        dir_frame = ttk.LabelFrame(parent, text="③ 保存设置", padding=10)
        dir_frame.pack(fill="x", pady=(0, 8))

        dir_row = ttk.Frame(dir_frame)
        dir_row.pack(fill="x", pady=(0, 6))
        ttk.Label(dir_row, text="导出目录：", foreground=FG_DIM).pack(side="left")
        ttk.Entry(dir_row, textvariable=self._out_dir).pack(side="left", fill="x", expand=True, padx=(4, 6))

        if self._icons.btn_icon:
            browse_btn = ttk.Button(
                dir_row, text="浏览", image=self._icons.btn_icon,
                compound="left", style="Icon.TButton", command=self._choose_dir,
            )
        else:
            browse_btn = ttk.Button(dir_row, text="浏览", command=self._choose_dir)
        browse_btn.pack(side="left")

        name_row = ttk.Frame(dir_frame)
        name_row.pack(fill="x")
        ttk.Label(name_row, text="文件命名：", foreground=FG_DIM).pack(side="left")
        name_entry = ttk.Entry(name_row, textvariable=self._custom_name)
        name_entry.pack(side="left", fill="x", expand=True, padx=(4, 0))
        ttk.Label(name_row, text="  留空则使用对话标题", style="Sub.TLabel").pack(side="left", padx=(8, 0))

        action_frame = ttk.Frame(parent)
        action_frame.pack(fill="x", pady=10)

        if self._icons.btn_icon:
            self.export_btn = ttk.Button(
                action_frame, text="  开始导出", image=self._icons.btn_icon,
                compound="left", style="AccentIcon.TButton", command=self._on_export,
            )
        else:
            self.export_btn = ttk.Button(
                action_frame, text="开始导出", style="Accent.TButton", command=self._on_export,
            )
        self.export_btn.pack(side="left")
        self.progress = ttk.Progressbar(action_frame, mode="indeterminate", length=260)
        self.progress.pack(side="left", fill="x", expand=True, padx=(16, 0))

        log_frame = ttk.LabelFrame(parent, text="日志", padding=6)
        log_frame.pack(fill="both", expand=True, pady=(0, 2))
        self.log_text = tk.Text(
            log_frame, height=8, state="disabled", font=("Consolas", 9), wrap="word",
            bg=BG_INPUT, fg=FG_GREEN, insertbackground=FG,
            selectbackground=SELECTION, selectforeground="#ffffff",
            relief="flat", borderwidth=1, highlightthickness=0,
        )
        log_scroll = ttk.Scrollbar(log_frame, command=self.log_text.yview)
        self.log_text.configure(yscrollcommand=log_scroll.set)
        self.log_text.pack(side="left", fill="both", expand=True)
        log_scroll.pack(side="right", fill="y")

    def _build_settings_tab(self, parent: ttk.Frame):
        ttk.Label(
            parent,
            text="导出选项与高级设置",
            style="Header.TLabel",
        ).pack(anchor="w", pady=(0, 12))

        opt_frame = ttk.LabelFrame(parent, text="导出选项", padding=10)
        opt_frame.pack(fill="x", pady=(0, 10))
        ttk.Checkbutton(opt_frame, text="导出思考过程（默认关闭：信噪比低，仅保留正式回答更干净）", variable=self._include_think).pack(anchor="w")
        ttk.Checkbutton(opt_frame, text="无头模式（后台运行浏览器，登录时请先取消勾选）", variable=self._headless).pack(anchor="w", pady=(6, 0))

        info_frame = ttk.LabelFrame(parent, text="选择器信息", padding=10)
        info_frame.pack(fill="x", pady=(0, 10))
        from .browser import SEL_ITEM, SEL_USER_TEXT, SEL_THINK_CONTENT, SEL_MAIN_CONTENT
        selectors_info = [
            ("消息容器", SEL_ITEM),
            ("用户消息", SEL_USER_TEXT),
            ("思考过程", SEL_THINK_CONTENT),
            ("正式回答", SEL_MAIN_CONTENT),
        ]
        for label, sel in selectors_info:
            row = ttk.Frame(info_frame)
            row.pack(fill="x", pady=2)
            ttk.Label(row, text=label + "：", width=10, foreground=FG_DIM).pack(side="left")
            ttk.Label(row, text=sel, style="Sub.TLabel").pack(side="left")

        path_frame = ttk.LabelFrame(parent, text="数据路径", padding=10)
        path_frame.pack(fill="x", pady=(0, 10))
        from .browser import USER_DATA_DIR
        ttk.Label(path_frame, text=f"浏览器登录数据保存目录：{USER_DATA_DIR}", style="Sub.TLabel").pack(anchor="w")
        ttk.Label(path_frame, text=f"默认导出目录：{DEFAULT_OUT_DIR}", style="Sub.TLabel").pack(anchor="w", pady=(4, 0))

        tool_frame = ttk.LabelFrame(parent, text="后处理工具", padding=10)
        tool_frame.pack(fill="x", pady=(0, 10))
        ttk.Label(tool_frame, text="批量去除导出目录中已有 .md 文件的思考过程（<details> 块）：", style="Sub.TLabel").pack(anchor="w")
        strip_btn_row = ttk.Frame(tool_frame)
        strip_btn_row.pack(fill="x", pady=(6, 0))
        if self._icons.btn_icon:
            ttk.Button(
                strip_btn_row, text="去除思考过程", image=self._icons.btn_icon,
                compound="left", style="Icon.TButton", command=self._on_strip_thinking,
            ).pack(side="left")
        else:
            ttk.Button(strip_btn_row, text="去除思考过程", command=self._on_strip_thinking).pack(side="left")
        ttk.Label(strip_btn_row, text="  处理导出目录下所有 .md 文件", style="Sub.TLabel").pack(side="left", padx=(8, 0))

    def _choose_dir(self):
        d = filedialog.askdirectory(initialdir=self._out_dir.get() or str(Path.home()))
        if d:
            self._out_dir.set(d)

    def _on_strip_thinking(self):
        from .exporter import strip_thinking_from_dir
        out_dir = Path(self._out_dir.get())
        if not out_dir.is_dir():
            messagebox.showwarning("提示", f"导出目录不存在：{out_dir}")
            return
        md_files = list(out_dir.glob("*.md"))
        if not md_files:
            messagebox.showinfo("提示", "导出目录下没有 .md 文件")
            return
        modified = strip_thinking_from_dir(out_dir)
        if modified:
            names = "\n".join(f"  · {p.name}" for p in modified)
            messagebox.showinfo("完成", f"已去除 {len(modified)} 个文件的思考过程：\n{names}")
        else:
            messagebox.showinfo("提示", "所有文件均不含思考过程块，无需处理")

    def _log(self, text: str):
        self.log_text.configure(state="normal")
        self.log_text.insert("end", text + "\n")
        self.log_text.see("end")
        self.log_text.configure(state="disabled")

    def _poll_queue(self):
        try:
            while True:
                kind, payload = self._msg_queue.get_nowait()
                if kind == "log":
                    self._log(payload)
                elif kind == "status":
                    self._status_var.set(payload)
                elif kind == "done":
                    self.progress.stop()
                    self.export_btn.configure(state="normal")
                    self._status_var.set("导出完成")
                    messagebox.showinfo("完成", payload)
                elif kind == "error":
                    self.progress.stop()
                    self.export_btn.configure(state="normal")
                    self._status_var.set("出错")
                    messagebox.showerror("出错", payload)
        except queue.Empty:
            pass
        self.after(200, self._poll_queue)

    def _on_login(self):
        if self._worker_thread and self._worker_thread.is_alive():
            messagebox.showwarning("提示", "有任务正在进行，请稍候")
            return

        err = ensure_browser_installed()
        if err:
            messagebox.showerror("浏览器未安装", err)
            return

        self._status_var.set("正在打开浏览器登录…")

        def task():
            self._msg_queue.put(("log", "正在打开浏览器，请在弹出的窗口中手动完成登录..."))
            try:
                with DeepSeekBrowser(headless=False) as browser:
                    ok = browser.ensure_login(timeout_sec=300)
                    if ok:
                        self._msg_queue.put(("log", "✓ 检测到登录成功，登录状态已保存。"))
                        self._msg_queue.put(("status", "✓ 就绪 — 已登录"))
                    else:
                        self._msg_queue.put(("log", "✗ 未检测到登录成功（超时），请重试。"))
                        self._msg_queue.put(("status", "就绪"))
            except Exception as e:
                self._msg_queue.put(("error", f"登录过程出错：{e}"))

        self._worker_thread = threading.Thread(target=task, daemon=True)
        self._worker_thread.start()

    def _on_export(self):
        if self._worker_thread and self._worker_thread.is_alive():
            messagebox.showwarning("提示", "有任务正在进行，请稍候")
            return

        err = ensure_browser_installed()
        if err:
            messagebox.showerror("浏览器未安装", err)
            return

        urls = [u.strip() for u in self.url_text.get("1.0", "end").splitlines() if u.strip()]
        urls = [u for u in urls if u.startswith("http")]
        if not urls:
            messagebox.showwarning("提示", "请粘贴至少一个有效的对话链接")
            return

        out_dir = Path(self._out_dir.get())
        include_think = self._include_think.get()
        headless = self._headless.get()
        custom_name = self._custom_name.get().strip()

        self.export_btn.configure(state="disabled")
        self.progress.start(12)
        self._status_var.set("正在导出…")

        def task():
            try:
                from .exporter import check_duplicate
                with DeepSeekBrowser(headless=headless) as browser:
                    for i, url in enumerate(urls, 1):
                        self._msg_queue.put(("log", f"[{i}/{len(urls)}] 正在抓取：{url}"))
                        self._msg_queue.put(("status", f"正在抓取 {i}/{len(urls)}…"))

                        def progress_cb(msg: str, _url=url):
                            self._msg_queue.put(("log", f"    {msg}"))

                        result = browser.export_conversation(
                            url, include_think=include_think, progress_cb=progress_cb
                        )
                        user_count = sum(1 for t in result.turns if t.role == "user")
                        assistant_count = sum(1 for t in result.turns if t.role == "assistant")

                        dup = check_duplicate(result, out_dir)
                        if dup:
                            self._msg_queue.put(("log", f"    ⚠ 检测到相似文件：{dup.name}，仍继续导出"))

                        name_for_this = custom_name if custom_name else ""
                        if len(urls) > 1 and not name_for_this:
                            name_for_this = result.title

                        path = save_markdown(
                            result, out_dir,
                            include_think=include_think,
                            custom_name=name_for_this,
                        )
                        self._msg_queue.put((
                            "log",
                            f"    ✓ 完成！用户消息 {user_count} 条 · AI 消息 {assistant_count} 条 → {path}",
                        ))
                self._msg_queue.put(("done", f"全部 {len(urls)} 个对话导出完成！\n保存目录：{out_dir}"))
            except Exception as e:
                self._msg_queue.put(("error", f"导出过程出错：{e}"))

        self._worker_thread = threading.Thread(target=task, daemon=True)
        self._worker_thread.start()


def run():
    app = App()
    app.mainloop()