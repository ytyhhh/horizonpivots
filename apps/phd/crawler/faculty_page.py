#!/usr/bin/env python3
"""Fetch one public university profile after robots.txt and domain checks.

Usage:
  python crawler/faculty_page.py URL ALLOWED_DOMAIN

Install separately in the worker image:
  pip install "scrapling[all]>=0.4.12"
"""

from __future__ import annotations

import json
import re
import sys
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

from scrapling.fetchers import Fetcher


USER_AGENT = "PhDScopeBot/0.1 (+https://example.invalid/bot)"


def fail(message: str) -> None:
    print(json.dumps({"ok": False, "error": message}, ensure_ascii=False))
    raise SystemExit(1)


def allowed_host(url: str, allowed_domain: str) -> bool:
    host = (urlparse(url).hostname or "").lower()
    domain = allowed_domain.lower().strip(".")
    return host == domain or host.endswith(f".{domain}")


def robots_allows(url: str) -> bool:
    parsed = urlparse(url)
    robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
    parser = RobotFileParser(robots_url)
    try:
        parser.read()
        return parser.can_fetch(USER_AGENT, url)
    except Exception:
        return False


def main() -> None:
    if len(sys.argv) != 3:
        fail("Expected URL and allowed domain")
    url, domain = sys.argv[1], sys.argv[2]
    if urlparse(url).scheme not in {"http", "https"}:
        fail("Only HTTP(S) URLs are allowed")
    if not allowed_host(url, domain):
        fail("URL is outside the selected university domain")
    if not robots_allows(url):
        fail("robots.txt does not allow this page")

    page = Fetcher.get(
        url,
        headers={"User-Agent": USER_AGENT},
        timeout=20,
        follow_redirects="safe",
    )
    for selector in ("script", "style", "noscript", "svg", "iframe", "[hidden]"):
        for node in page.css(selector):
            node.remove()

    main_nodes = page.css("main, article, [role='main']")
    content = " ".join(node.get_all_text(separator=" ", strip=True) for node in main_nodes)
    if not content:
        content = page.get_all_text(separator=" ", strip=True)
    content = re.sub(r"\s+", " ", content)[:18000]
    title = page.css("h1::text").get() or page.css("title::text").get() or ""
    emails = sorted(set(re.findall(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", content, re.I)))

    print(
        json.dumps(
            {
                "ok": True,
                "url": str(page.url),
                "title": title.strip(),
                "text": content,
                "emails": emails[:5],
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
