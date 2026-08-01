#!/usr/bin/env python3
"""Fetch the newest public CUHK-Shenzhen job posts with Scrapling and ingest them."""

from __future__ import annotations

import json
import os
import re
import sys
import time
from datetime import date
from urllib.parse import urljoin
from urllib.request import Request, urlopen

from scrapling.fetchers import Fetcher

BASE_URL = "https://career.cuhk.edu.cn/job/search/?domain=careercuhk"
ORIGIN = "https://career.cuhk.edu.cn"
MAX_PAGES = max(1, min(int(os.getenv("CUHKSZ_MAX_PAGES", "3")), 10))


def clean(value: str | None) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def parse_date(value: str) -> str | None:
    match = re.search(r"(20\d{2}-\d{2}-\d{2})", value)
    return match.group(1) if match else None


def fetch_page(page_number: int):
    separator = "&" if "?" in BASE_URL else "?"
    url = BASE_URL if page_number == 1 else f"{BASE_URL}{separator}page={page_number}"
    return Fetcher.get(url, impersonate="chrome", stealthy_headers=True)


def extract_jobs(page):
    jobs = []
    for card in page.css(".sousuo_list > ul > li"):
        anchors = card.css("a.f18")
        anchor = anchors[0] if anchors else None
        href = anchor.attrib.get("href") if anchor else None
        title = clean(anchor.css("::text").get() if anchor else None)
        company = clean(card.css(".sousuo_list_com a::text").get())
        if not (href and title and company):
            continue
        text = clean(" ".join(card.css(".sousuo_list_xx .mt10 ::text").getall()))
        published = parse_date(clean(card.css(".sousuo_span1::text").get())) or date.today().isoformat()
        deadline = parse_date(clean(card.css(".sousuo_span2::text").get()))
        location = clean(text.split("｜")[0])
        locations = [] if location in {"", "不限", "不限 - 不限"} else [location]
        jobs.append(
            {
                "id": re.search(r"/id/(\d+)", href).group(1),
                "company": company,
                "title": title,
                "type": "实习" if "实习" in f"{title} {text}" else "秋招",
                "locations": locations,
                "cohort": "2027届" if "2027" in f"{title} {text}" else "不限",
                "summary": f"{text}。".strip("。"),
                "deadline": deadline,
                "sourceUrl": urljoin(ORIGIN, href),
                "firstSeen": published,
            }
        )
    return jobs


def post_jobs(jobs: list[dict]):
    endpoint = os.environ["CAMPUS_RADAR_INGEST_URL"].rstrip("/")
    secret = os.environ["CAMPUS_RADAR_CRON_SECRET"]
    body = json.dumps({"jobs": jobs}, ensure_ascii=False).encode()
    request = Request(
        f"{endpoint}/api/cron/cuhksz-ingest",
        data=body,
        headers={"Authorization": f"Bearer {secret}", "Content-Type": "application/json"},
        method="POST",
    )
    with urlopen(request, timeout=60) as response:
        return json.loads(response.read())


def main():
    deduped = {}
    for page_number in range(1, MAX_PAGES + 1):
        for job in extract_jobs(fetch_page(page_number)):
            deduped[job["sourceUrl"]] = job
        if page_number < MAX_PAGES:
            time.sleep(1.2)
    if not deduped:
        raise RuntimeError("No jobs found; refusing to report a successful empty crawl")
    result = post_jobs(list(deduped.values()))
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"CUHK-Shenzhen crawl failed: {error}", file=sys.stderr)
        raise
