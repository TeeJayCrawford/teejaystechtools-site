#!/usr/bin/env python3
"""Local, no-network guardrails for the TeeJay's Tech Tools revenue pod."""

from __future__ import annotations

import argparse
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "ops" / "agents.json"
SECRET_PATTERNS = (
    re.compile(r"gh[oprsu]_[A-Za-z0-9_]{20,}"),
    re.compile(r"AIza[0-9A-Za-z_-]{30,}"),
    re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
)


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.title_parts: list[str] = []
        self.in_title = False
        self.h1_count = 0
        self.description = ""
        self.canonical = ""
        self.robots = ""
        self.links: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if tag == "title":
            self.in_title = True
        elif tag == "h1":
            self.h1_count += 1
        elif tag == "meta":
            name = (values.get("name") or "").lower()
            if name == "description":
                self.description = values.get("content") or ""
            elif name == "robots":
                self.robots = (values.get("content") or "").lower()
        elif tag == "link" and (values.get("rel") or "").lower() == "canonical":
            self.canonical = values.get("href") or ""
        elif tag in {"a", "link", "script", "img"}:
            target = values.get("href") or values.get("src")
            if target:
                self.links.append(target)

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self.in_title = False

    def handle_data(self, data: str) -> None:
        if self.in_title:
            self.title_parts.append(data)

    @property
    def title(self) -> str:
        return "".join(self.title_parts).strip()


def load_config() -> dict:
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))


def local_target(source: Path, raw: str, root: Path) -> Path | None:
    split = urlsplit(raw)
    if split.scheme or raw.startswith(("#", "mailto:", "tel:", "data:")):
        return None
    clean = split.path
    if not clean:
        return None
    if clean.startswith("/"):
        candidate = root / clean.lstrip("/")
    else:
        candidate = source.parent / clean
    if clean.endswith("/"):
        candidate = candidate / "index.html"
    elif not candidate.suffix:
        candidate = candidate / "index.html"
    return candidate.resolve()


def audit(root: Path) -> list[str]:
    root = root.resolve()
    config = load_config()
    errors: list[str] = []
    parsed: dict[Path, PageParser] = {}

    for relative in config["core_pages"]:
        path = root / relative
        if not path.is_file():
            errors.append(f"missing core page: {relative}")
            continue
        text = path.read_text(encoding="utf-8")
        parser = PageParser()
        parser.feed(text)
        parsed[path] = parser
        if not parser.title:
            errors.append(f"{relative}: missing title")
        if not (80 <= len(parser.description) <= 180):
            errors.append(f"{relative}: description must be 80-180 characters")
        if parser.h1_count != 1:
            errors.append(f"{relative}: expected exactly one h1, found {parser.h1_count}")
        if not parser.canonical.startswith("https://teejaystechtools.com/"):
            errors.append(f"{relative}: missing canonical production URL")
        if "noindex" in parser.robots:
            errors.append(f"{relative}: core page must be indexable")

    for path in root.rglob("*.html"):
        if any(part in {".git", "node_modules"} for part in path.parts):
            continue
        text = path.read_text(encoding="utf-8")
        for pattern in SECRET_PATTERNS:
            if pattern.search(text):
                errors.append(f"{path.relative_to(root)}: possible secret material")
        parser = parsed.get(path)
        if parser is None:
            parser = PageParser()
            parser.feed(text)
        for raw in parser.links:
            target = local_target(path, raw, root)
            if target and root in target.parents and not target.exists():
                errors.append(f"{path.relative_to(root)}: broken local reference {raw}")

    required_noindex = (
        root / "concept" / "index.html",
        root / "newsletter" / "thanks" / "index.html",
        root / "newsletter" / "welcome" / "index.html",
        root / "newsletter" / "issues" / "template.html",
    )
    for path in required_noindex:
        if path.is_file():
            parser = PageParser()
            parser.feed(path.read_text(encoding="utf-8"))
            if "noindex" not in parser.robots:
                errors.append(f"{path.relative_to(root)}: utility page must be noindex")
    return sorted(set(errors))


def status() -> None:
    config = load_config()
    print(f"Executive owner: {config['executive_owner']}")
    for agent in config["agents"]:
        print(f"{agent['name']:<10} {agent['mode']:<12} {agent['function']}")


def qualify(args: argparse.Namespace) -> None:
    brief = {
        "business": args.business,
        "locations": args.locations,
        "problem": args.problem,
        "timeline": args.timeline,
        "recommended_next_step": "20-minute fit check",
        "status": "draft_only",
        "external_action_taken": False,
        "executive_authorization_required_before_response": True,
    }
    print(json.dumps(brief, indent=2))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("status")
    audit_parser = subparsers.add_parser("audit")
    audit_parser.add_argument("root", nargs="?", default=str(ROOT))
    qualify_parser = subparsers.add_parser("qualify")
    qualify_parser.add_argument("--business", required=True)
    qualify_parser.add_argument("--locations", type=int, default=1)
    qualify_parser.add_argument("--problem", required=True)
    qualify_parser.add_argument("--timeline", default="Not provided")
    args = parser.parse_args()

    if args.command == "status":
        status()
        return 0
    if args.command == "qualify":
        qualify(args)
        return 0
    errors = audit(Path(args.root))
    if errors:
        print("Site audit failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    print("Site audit passed: core metadata, local references, noindex boundaries, and secret patterns checked.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
