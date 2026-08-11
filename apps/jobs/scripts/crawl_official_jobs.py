#!/usr/bin/env python3
"""Render trusted public recruiting pages with Scrapling and submit sanitized batches."""

from __future__ import annotations

import json
import os
import re
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen
from urllib.robotparser import RobotFileParser

from scrapling.fetchers import DynamicFetcher, Fetcher

USER_AGENT = "CampusRadar/1.0 (+public-job-index)"
MAX_TASKS = 10
MAX_PAGES_PER_SOURCE = 5
MAX_PAGE_CHARS = 400_000
RECRUITING_PATTERN = re.compile(r"校招|校园招聘|秋招|实习|应届|graduate|intern|career|job", re.I)


def api_request(path: str, *, payload: dict | None = None):
    endpoint = os.environ["CAMPUS_RADAR_INGEST_URL"].rstrip("/")
    secret = os.environ["CAMPUS_RADAR_CRON_SECRET"]
    body = json.dumps(payload, ensure_ascii=False).encode() if payload is not None else None
    request = Request(
        f"{endpoint}{path}",
        data=body,
        headers={
            "Authorization": f"Bearer {secret}",
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
        },
        method="POST" if payload is not None else "GET",
    )
    for attempt in range(1, 4):
        try:
            with urlopen(request, timeout=330) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")[:1000]
            if error.code not in {429, 500, 502, 503, 504} or attempt == 3:
                raise RuntimeError(f"API {path} returned {error.code}: {detail}") from error
        except (URLError, TimeoutError) as error:
            if attempt == 3:
                raise RuntimeError(f"API {path} failed: {error}") from error
        time.sleep(2 ** (attempt - 1))
    raise RuntimeError(f"API {path} failed unexpectedly")


def robots_allows(url: str) -> bool:
    parsed = urlparse(url)
    robots = RobotFileParser(f"{parsed.scheme}://{parsed.netloc}/robots.txt")
    try:
        robots.read()
        return robots.can_fetch(USER_AGENT, url)
    except Exception:
        return True


def page_html(page) -> str:
    value = str(page.html_content)
    return value[:MAX_PAGE_CHARS]


def visible_text(page) -> str:
    return re.sub(r"\s+", " ", " ".join(page.css("body ::text").getall())).strip()


def fetch_rendered(url: str):
    if not robots_allows(url):
        raise RuntimeError(f"robots.txt disallows {url}")
    static_page = Fetcher.get(url, impersonate="chrome", stealthy_headers=True, timeout=30)
    text = visible_text(static_page)
    if len(text) >= 1000 and RECRUITING_PATTERN.search(text):
        return static_page, "http"
    dynamic_page = DynamicFetcher.fetch(
        url,
        headless=True,
        network_idle=True,
        disable_resources=True,
        timeout=45_000,
        wait=1_500,
    )
    return dynamic_page, "browser"


def recruiting_links(page, source_url: str) -> list[str]:
    source_host = urlparse(source_url).hostname
    links: list[str] = []
    for anchor in page.css("a[href]"):
        label = " ".join(anchor.css("::text").getall()).strip()
        href = anchor.attrib.get("href", "")
        target = urljoin(source_url, href)
        parsed = urlparse(target)
        if parsed.scheme != "https" or parsed.hostname != source_host:
            continue
        if not RECRUITING_PATTERN.search(f"{label} {parsed.path}"):
            continue
        target = target.split("#", 1)[0]
        if target not in links and target != source_url:
            links.append(target)
    return links


def crawl_task(task: dict):
    source_url = str(task["url"])
    root_page, mode = fetch_rendered(source_url)
    discovered = recruiting_links(root_page, source_url)
    pages = [{"url": source_url, "html": page_html(root_page)}]
    for target in discovered[: MAX_PAGES_PER_SOURCE - 1]:
        time.sleep(1.2)
        try:
            page, _ = fetch_rendered(target)
            pages.append({"url": target, "html": page_html(page)})
        except Exception as error:
            print(f"Page fetch failed for {target}: {error}", file=sys.stderr)
    result = api_request(
        "/api/cron/official-browser-ingest",
        payload={
            "sourceId": task["sourceId"],
            "pages": pages,
            "complete": len(discovered) <= MAX_PAGES_PER_SOURCE - 1,
        },
    )
    print(json.dumps({"source": task["name"], "fetchMode": mode, "result": result}, ensure_ascii=False))


def main():
    response = api_request(f"/api/cron/official-browser-tasks?limit={MAX_TASKS}")
    tasks = response.get("tasks", [])
    print(f"Received {len(tasks)} browser task(s)", file=sys.stderr)
    for task in tasks:
        try:
            crawl_task(task)
        except Exception as error:
            print(f"Browser crawl failed for {task.get('name', task.get('sourceId'))}: {error}", file=sys.stderr)
            try:
                api_request(
                    "/api/cron/official-browser-ingest",
                    payload={"sourceId": task["sourceId"], "error": str(error)[:1000]},
                )
            except Exception as report_error:
                print(f"Failure reporting also failed: {report_error}", file=sys.stderr)


if __name__ == "__main__":
    main()
