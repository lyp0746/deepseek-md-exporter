# -*- mode: python ; coding: utf-8 -*-
import sys
from pathlib import Path

block_cipher = None

src = str(Path(SPECPATH) / "src")
icon_ico = str(Path(SPECPATH) / "icon.ico")
icon_png = str(Path(SPECPATH) / "icon.png")

a = Analysis(
    [str(Path(SPECPATH) / "entry.py")],
    pathex=[src, SPECPATH],
    binaries=[],
    datas=[
        (icon_png, "."),
    ],
    hiddenimports=[
        "deepseek_exporter",
        "deepseek_exporter.main",
        "deepseek_exporter.gui",
        "deepseek_exporter.browser",
        "deepseek_exporter.converter",
        "deepseek_exporter.exporter",
        "PIL",
        "PIL.Image",
        "PIL.ImageTk",
        "playwright",
        "playwright._impl",
        "playwright._impl._driver",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name="深寻全录",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=icon_ico,
)