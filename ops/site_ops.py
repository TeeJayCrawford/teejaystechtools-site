#!/usr/bin/env python3
"""Local, no-network guardrails for the TeeJay's Tech Tools revenue pod."""

from __future__ import annotations

import argparse
import json
import re
import sys
import xml.etree.ElementTree as ET
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
        self.google_site_verification = ""
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
            elif name == "google-site-verification":
                self.google_site_verification = values.get("content") or ""
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

    robots_path = root / "robots.txt"
    sitemap_path = root / "sitemap.xml"
    llms_path = root / "llms.txt"
    sitemap_urls: set[str] = set()

    if not robots_path.is_file():
        errors.append("missing robots.txt")
    else:
        robots_text = robots_path.read_text(encoding="utf-8")
        for required in (
            "User-agent: *",
            "Allow: /",
            "Sitemap: https://teejaystechtools.com/sitemap.xml",
        ):
            if required not in robots_text:
                errors.append(f"robots.txt: missing {required}")

    if not sitemap_path.is_file():
        errors.append("missing sitemap.xml")
    else:
        try:
            sitemap_root = ET.parse(sitemap_path).getroot()
            sitemap_urls = {
                element.text.strip()
                for element in sitemap_root.findall("{http://www.sitemaps.org/schemas/sitemap/0.9}url/{http://www.sitemaps.org/schemas/sitemap/0.9}loc")
                if element.text
            }
        except ET.ParseError as error:
            errors.append(f"sitemap.xml: invalid XML ({error})")

    if not llms_path.is_file():
        errors.append("missing llms.txt")
    else:
        llms_text = llms_path.read_text(encoding="utf-8")
        if len(llms_text.encode("utf-8")) > 4096:
            errors.append("llms.txt: keep the public guide under 4 KB")
        llms_lines = llms_text.splitlines()
        if not llms_lines or not llms_lines[0].startswith("# "):
            errors.append("llms.txt: first line must be a site-name h1")
        if not any(line.startswith("> ") for line in llms_lines[:5]):
            errors.append("llms.txt: include a summary blockquote after the h1")
        in_file_list = False
        file_link_pattern = re.compile(r"^- \[[^\]]+\]\(https://[^)]+\)(?:: .+)?$")
        for line in llms_lines:
            if line.startswith("## "):
                in_file_list = True
            elif in_file_list and line.startswith("- ") and not file_link_pattern.fullmatch(line):
                errors.append(f"llms.txt: file-list item must be a Markdown link ({line})")
        for required in (
            "https://teejaystechtools.com/",
            "https://teejaystechtools.com/sitemap.xml",
            "https://teejaystechtools.com/free-ai-search-audit.html",
        ):
            if required not in llms_text:
                errors.append(f"llms.txt: missing {required}")

    indexnow_keys = [
        path for path in root.glob("*.txt") if re.fullmatch(r"[0-9a-f]{32}\.txt", path.name)
    ]
    if len(indexnow_keys) != 1:
        errors.append(f"expected exactly one root IndexNow key file, found {len(indexnow_keys)}")
    elif indexnow_keys[0].read_text(encoding="utf-8").strip() != indexnow_keys[0].stem:
        errors.append("IndexNow key file content must match its filename")

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
        if (
            parser.canonical.startswith("https://teejaystechtools.com/")
            and "noindex" not in parser.robots
            and parser.canonical not in sitemap_urls
        ):
            errors.append(f"{path.relative_to(root)}: indexable canonical missing from sitemap.xml")
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

    homepage_parser = parsed.get(root / "index.html")
    if homepage_parser and not homepage_parser.google_site_verification:
        errors.append("index.html: missing Google Search Console verification tag")
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
