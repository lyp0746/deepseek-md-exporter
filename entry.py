import os
import sys

if not os.environ.get("PLAYWRIGHT_BROWSERS_PATH"):
    local_app = os.environ.get("LOCALAPPDATA", os.path.expanduser("~"))
    os.environ["PLAYWRIGHT_BROWSERS_PATH"] = os.path.join(local_app, "ms-playwright")

import deepseek_exporter.main

deepseek_exporter.main.main()