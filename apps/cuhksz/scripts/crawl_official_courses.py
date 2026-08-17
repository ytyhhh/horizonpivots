#!/usr/bin/env python3
"""Crawl the CUHK-Shenzhen official course catalogue via Scrapling.

The catalogue's default result is incomplete. This crawler enumerates every
official `major` filter, deduplicates course pages, and fetches each course's
official description with a small request delay.
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
import time
from pathlib import Path
from urllib.parse import urlencode

from scrapling.fetchers import FetcherSession


BASE_URL = "https://www.cuhk.edu.cn"
COURSE_URL = f"{BASE_URL}/zh-hans/course"
USER_AGENT = "HorizonPivotsCourseImporter/2.0 (+https://cuhksz.horizonpivots.com)"

logging.getLogger("scrapling").setLevel(logging.WARNING)


def clean(value: object) -> str:
    return " ".join(str(value or "").replace("\xa0", " ").split())


def text_list(node) -> str:
    return clean(" ".join(node.css("::text").getall()))


def page_get(session: FetcherSession, url: str, delay: float):
    time.sleep(delay)
    page = session.get(url, headers={"User-Agent": USER_AGENT}, stealthy_headers=True)
    if page.status != 200:
        raise RuntimeError(f"官网请求失败：{page.status} {url}")
    return page


def build_catalog(output: Path, delay: float) -> dict:
    with FetcherSession(impersonate="chrome") as session:
        index = page_get(session, COURSE_URL, delay)
        majors: dict[str, str] = {}
        for link in index.css('a[data-select="major"]'):
            value = clean(link.attrib.get("data-val"))
            name = text_list(link)
            if value:
                majors[value] = name

        courses: dict[str, dict] = {}
        for major_id, major_name in majors.items():
            url = f"{COURSE_URL}?{urlencode({'major': major_id})}"
            page = page_get(session, url, delay)
            for item in page.css(".collapse-container .item"):
                links = item.css('a[href*="/zh-hans/course/"]')
                if not links:
                    continue
                href = clean(links[0].attrib.get("href"))
                code = clean(links[0].text)
                name = clean(links[1].text if len(links) > 1 else "")
                if not href.startswith("/zh-hans/course/") or not code:
                    continue
                courses[href] = {
                    "path": href,
                    "code": code.replace("-", "").upper(),
                    "name": name,
                    "major": major_name,
                }

    payload = {
        "source": COURSE_URL,
        "major_count": len(majors),
        "course_count": len(courses),
        "courses": sorted(courses.values(), key=lambda course: course["code"]),
    }
    output.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    return payload


def course_field(page, label: str) -> str:
    for row in page.css("table tr"):
        cells = row.css("td")
        if len(cells) >= 2 and clean(text_list(cells[0])) == label:
            return text_list(cells[1])
    return ""


def crawl_details(catalog: dict, offset: int, limit: int, delay: float) -> dict:
    selected = catalog["courses"][offset : offset + limit]
    results: list[dict] = []
    errors: list[dict] = []
    with FetcherSession(impersonate="chrome") as session:
        for course in selected:
            url = f"{BASE_URL}{course['path']}"
            try:
                page = page_get(session, url, delay)
                title = clean(page.css("h1::text").get()) or course["name"]
                description_title = page.xpath("//h3[normalize-space()='描述']")
                description = ""
                if description_title:
                    container = description_title[0].xpath("following::div[contains(@class, 'content')][1]")
                    if container:
                        description = text_list(container[0])
                results.append({
                    "code": course["code"],
                    "name": title,
                    "school": course_field(page, "开课学院") or "官方课程目录",
                    "term": course_field(page, "学期") or "学期待补充",
                    "description": description or "官方课程页暂未提供课程描述。",
                    "officialUrl": url,
                })
            except Exception as error:  # keep the rest of the catalogue importable
                errors.append({"code": course["code"], "url": url, "error": str(error)})
    return {
        "total": catalog["course_count"],
        "offset": offset,
        "courses": results,
        "errors": errors,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--catalog", required=True, type=Path)
    parser.add_argument("--refresh-catalog", action="store_true")
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument("--limit", type=int, default=25)
    parser.add_argument("--delay", type=float, default=0.25)
    args = parser.parse_args()

    if args.refresh_catalog or not args.catalog.exists():
        catalog = build_catalog(args.catalog, args.delay)
    else:
        catalog = json.loads(args.catalog.read_text(encoding="utf-8"))

    print(json.dumps(crawl_details(catalog, args.offset, args.limit, args.delay), ensure_ascii=False))


if __name__ == "__main__":
    main()
