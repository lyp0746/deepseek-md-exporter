import os

if not os.environ.get("PLAYWRIGHT_BROWSERS_PATH"):
    local_app = os.environ.get("LOCALAPPDATA", os.path.expanduser("~"))
    os.environ["PLAYWRIGHT_BROWSERS_PATH"] = os.path.join(local_app, "ms-playwright")

from .gui import run


def main():
    run()


if __name__ == "__main__":
    main()