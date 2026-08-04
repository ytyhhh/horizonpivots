#!/usr/bin/env python3
"""Fetch the newest public CUHK-Shenzhen job posts with Scrapling and ingest them."""

from __future__ import annotations

import json
import os
import re
import socket
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

from scrapling.fetchers import Fetcher

BASE_URL = "https://career.cuhk.edu.cn/job/search/?domain=careercuhk"
ORIGIN = "https://career.cuhk.edu.cn"
MAX_PAGES = max(1, min(int(os.getenv("CUHKSZ_MAX_PAGES", "8")), 8))
DETAIL_WORKERS = max(1, min(int(os.getenv("CUHKSZ_DETAIL_WORKERS", "4")), 4))
DETAIL_BATCH_SIZE = 25
INGEST_BATCH_SIZE = max(1, min(int(os.getenv("CUHKSZ_INGEST_BATCH_SIZE", "40")), 50))
INGEST_RETRIES = max(1, min(int(os.getenv("CUHKSZ_INGEST_RETRIES", "4")), 6))
TRAILING_URL_PUNCTUATION = ".,;:!?，。；：！？)]}）】》〉\"”'’"


def clean(value: str | None) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def parse_date(value: str) -> str | None:
    match = re.search(r"(20\d{2}-\d{2}-\d{2})", value)
    return match.group(1) if match else None


def fetch_page(page_number: int):
    separator = "&" if "?" in BASE_URL else "?"
    url = BASE_URL if page_number == 1 else f"{BASE_URL}{separator}page={page_number}"
    return Fetcher.get(url, impersonate="chrome", stealthy_headers=True)


def external_http_url(value: str, source_url: str) -> str | None:
    """Only accept a public, non-campus http(s) URL as an application target."""
    candidate = urljoin(source_url, value.strip()).rstrip(TRAILING_URL_PUNCTUATION)
    try:
        parsed = urlparse(candidate)
    except ValueError:
        return None
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None
    if parsed.hostname == "career.cuhk.edu.cn":
        return None
    return candidate


def extract_apply_url(section, source_url: str) -> str | None:
    """Prefer a real anchor href, then recognize an external URL written as text."""
    candidates = section.css("a::attr(href)").getall()
    candidates.extend(re.findall(r"https?://[^\s<>'\"]+", " ".join(section.css("::text").getall())))
    for candidate in candidates:
        url = external_http_url(candidate, source_url)
        if url:
            return url
    return None


def fetch_description(source_url: str) -> tuple[str, str | None]:
    """Return plain-text description and an optional external application URL."""
    try:
        page = Fetcher.get(source_url, impersonate="chrome", stealthy_headers=True)
        for section in page.css(".article .mb20"):
            heading = clean(" ".join(section.css("h3.subart_h3::text").getall()))
            if "工作内容描述" not in heading:
                continue
            description = clean(" ".join(section.css("h3.subart_h3 + div ::text").getall()))[:12_000]
            return description, extract_apply_url(section, source_url)
    except Exception as error:
        print(f"Description fetch failed for {source_url}: {error}", file=sys.stderr)
    return "", None


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
        source_url = urljoin(ORIGIN, href)
        jobs.append(
            {
                "id": re.search(r"/id/(\d+)", href).group(1),
                "company": company,
                "title": title,
                "type": (
                    "实习"
                    if "实习" in f"{title} {text}"
                    else "春招"
                    if re.search(r"春招|春季", f"{title} {text}")
                    else "秋招"
                ),
                "locations": locations,
                "cohort": "2027届" if "2027" in f"{title} {text}" else "不限",
                "summary": f"{text}。".strip("。"),
                "deadline": deadline,
                "sourceUrl": source_url,
                "firstSeen": published,
            }
        )
    return jobs


def post_jobs(jobs: list[dict], label: str):
    endpoint = os.environ["CAMPUS_RADAR_INGEST_URL"].rstrip("/")
    secret = os.environ["CAMPUS_RADAR_CRON_SECRET"]
    body = json.dumps({"jobs": jobs}, ensure_ascii=False).encode()
    url = f"{endpoint}/api/cron/cuhksz-ingest"

    for attempt in range(1, INGEST_RETRIES + 1):
        request = Request(
            url,
            data=body,
            headers={
                "Authorization": f"Bearer {secret}",
                "Content-Type": "application/json",
                "User-Agent": "campus-radar-cuhksz-crawler/1.0",
            },
            method="POST",
        )
        try:
            with urlopen(request, timeout=60) as response:
                response_body = response.read().decode("utf-8", errors="replace")
            return json.loads(response_body)
        except HTTPError as error:
            response_body = error.read().decode("utf-8", errors="replace")[:1_000]
            retryable = error.code in {429, 500, 502, 503, 504}
            detail = f"HTTP {error.code}: {response_body or error.reason}"
            if not retryable or attempt == INGEST_RETRIES:
                raise RuntimeError(f"Ingest {label} failed after {attempt} attempt(s): {detail}") from error
        except (URLError, TimeoutError, socket.timeout) as error:
            detail = str(getattr(error, "reason", error))
            if attempt == INGEST_RETRIES:
                raise RuntimeError(
                    f"Ingest {label} failed after {attempt} attempt(s): {detail}"
                ) from error
        except json.JSONDecodeError as error:
            raise RuntimeError(
                f"Ingest {label} returned invalid JSON: {response_body[:500]}"
            ) from error

        wait_seconds = min(2 ** (attempt - 1), 8)
        print(
            f"Ingest {label} attempt {attempt} failed ({detail}); "
            f"retrying in {wait_seconds}s",
            file=sys.stderr,
        )
        time.sleep(wait_seconds)

    raise RuntimeError(f"Ingest {label} failed unexpectedly")


def post_job_batches(jobs: list[dict], label: str) -> list[dict]:
    results = []
    batch_count = (len(jobs) + INGEST_BATCH_SIZE - 1) // INGEST_BATCH_SIZE
    for index in range(0, len(jobs), INGEST_BATCH_SIZE):
        batch_number = index // INGEST_BATCH_SIZE + 1
        batch = jobs[index : index + INGEST_BATCH_SIZE]
        print(
            f"Uploading {label} batch {batch_number}/{batch_count} ({len(batch)} jobs)",
            file=sys.stderr,
        )
        results.append(post_jobs(batch, f"{label} {batch_number}/{batch_count}"))
    return results


def enrich_descriptions(jobs: list[dict]) -> list[dict]:
    """Fetch detail pages concurrently and persist every completed batch.

    The base listings are posted before this function starts. Therefore an
    interrupted run can leave some descriptions blank, but can never discard
    the eight pages of already discovered jobs.
    """
    results = []
    completed: list[dict] = []
    with ThreadPoolExecutor(max_workers=DETAIL_WORKERS) as executor:
        pending = {
            executor.submit(fetch_description, job["sourceUrl"]): job for job in jobs
        }
        for future in as_completed(pending):
            job = pending[future]
            job["description"], job["applyUrl"] = future.result()
            completed.append(job)
            if len(completed) == DETAIL_BATCH_SIZE:
                results.extend(post_job_batches(completed, "description"))
                completed = []
    if completed:
        results.extend(post_job_batches(completed, "description"))
    return results


def main():
    deduped = {}
    for page_number in range(1, MAX_PAGES + 1):
        for job in extract_jobs(fetch_page(page_number)):
            deduped[job["sourceUrl"]] = job
        if page_number < MAX_PAGES:
            time.sleep(1.2)
    if not deduped:
        raise RuntimeError("No jobs found; refusing to report a successful empty crawl")
    jobs = list(deduped.values())
    base_results = post_job_batches(jobs, "base")
    description_results = enrich_descriptions(jobs)
    print(
        json.dumps(
            {
                "baseIngestBatches": base_results,
                "descriptionBatches": description_results,
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"CUHK-Shenzhen crawl failed: {error}", file=sys.stderr)
        raise
