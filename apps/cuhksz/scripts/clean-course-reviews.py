#!/usr/bin/env python3
"""Normalize the CUHK-Shenzhen legacy course-review workbook.

The source workbook is intentionally kept untouched.  This script emits
auditable CSV/JSON import files in ``apps/cuhksz/data-cleaned`` and treats all
accepted entries as unrated historical reviews.  The source labels the last
rows simply as ``体育``; those activities are mapped to the official first-term
Physical Education (PED11xx) course codes published by CUHK-Shenzhen.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import re
from collections import Counter
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "data" / "课程评价.xlsx"
DEFAULT_OUTPUT = ROOT / "data-cleaned"
HISTORICAL_TERM = "历史评价（学期未注明）"
UNKNOWN_INSTRUCTOR = "未注明教师"

# Verified against CUHK-Shenzhen's Physical Education and Health Study Scheme
# (2025-26 and thereafter): the first-term Physical Education module uses
# PED11xx, while PED12xx belongs to the second-term Fitness and Health module.
SPORT_CODES = {
    "地壶": "PED1104",
    "飞盘": "PED1105",
    "毽球": "PED1112",
    "shuttlecock": "PED1112",
    "手球": "PED1107",
    "匹克球": "PED1110",
    "蛙泳": "PED1114",
    "游泳（蛙泳）": "PED1114",
    "游泳(蛙泳)": "PED1114",
    "跆拳道": "PED1117",
    "排球": "PED1121",
}
SPORT_NAMES = {
    "PED1104": "地壶",
    "PED1105": "飞盘",
    "PED1112": "毽球",
    "PED1107": "手球",
    "PED1110": "匹克球",
    "PED1114": "蛙泳",
    "PED1117": "跆拳道",
    "PED1121": "排球",
}


def clean(value: object) -> str:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return ""
    return " ".join(str(value).replace("\u00a0", " ").replace("\n", " ").split()).strip()


def load_course_names() -> dict[str, str]:
    """Use the existing course archive only for display titles, never codes."""
    names = dict(SPORT_NAMES)
    path = DEFAULT_OUTPUT / "courses.csv"
    if not path.exists():
        return names
    with path.open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            code = clean(row.get("code")).upper()
            name = clean(row.get("name"))
            if code and name:
                names[code] = name
    return names


def split_codes(raw_code: str) -> tuple[list[str], list[tuple[str, str]]]:
    """Return valid course codes and normalization notices for one row."""
    value = clean(raw_code).upper().replace("－", "-")
    notices: list[tuple[str, str]] = []
    if not value:
        return [], notices
    if value == "AVT4253":
        notices.append(("warning", "源表课程前缀疑似录入错误，按 ACT4253 修正"))
        return ["ACT4253"], notices
    if "ERG" in value:
        notices.append(("rejected", "“ERG 系列”不是可可靠关联的单门课程编号"))
        return [], notices

    direct = re.findall(r"[A-Z]{3}\s*\d{4}[A-Z]?", value)
    codes = [re.sub(r"\s+", "", item) for item in direct]
    if not codes:
        return [], notices

    # Spreadsheet shorthand such as FRN1001 /1002 denotes two courses.
    prefix = re.match(r"([A-Z]{3})\s*\d{4}", value)
    if prefix:
        for suffix in re.findall(r"[/、]\s*(\d{4}[A-Z]?)", value):
            candidate = f"{prefix.group(1)}{suffix}"
            if candidate not in codes:
                codes.append(candidate)
    codes = list(dict.fromkeys(codes))
    if len(codes) > 1:
        notices.append(("info", "同一行包含多个课程编号，已拆分为独立课程评价"))
    return codes, notices


def split_instructors(raw_instructor: str) -> list[str]:
    value = clean(raw_instructor)
    if not value:
        return [UNKNOWN_INSTRUCTOR]
    # Preserve Western names such as “Cao, yi” and “Park, Zhonghan”, but split
    # unmistakable multi-teacher cells such as “Vivian Mao,荣雪峰”.
    if re.search(r"[、/;；]", value) or re.search(r"[\u4e00-\u9fff]\s*[,，]\s*[\u4e00-\u9fff]", value) or re.search(r"[A-Za-z]+\s+[A-Za-z]+\s*[,，]\s*[\u4e00-\u9fff]", value):
        parts = [clean(part) for part in re.split(r"[、/;；]|(?<=[\u4e00-\u9fff])\s*[,，]\s*(?=[\u4e00-\u9fff])|(?<=[A-Za-z])\s*[,，]\s*(?=[\u4e00-\u9fff])", value)]
        return [part for part in parts if part] or [UNKNOWN_INSTRUCTOR]
    return [value]


QUESTION_PREFIX = re.compile(r"^(?:蹲+|求(?:问|推荐|评价)?|请问|有人(?:上过|了解)|有没有|求助)")
QUESTION_PHRASE = re.compile(
    r"^(?=.{1,48}$).*(?:给分|老师|课程|工作量|难度|期末|作业|考试).*(?:怎么样|如何|咋样|吗|么|呢|啥|哪位)$",
)
QUESTION_LEAD = re.compile(
    r"^(?:给分|老师|课程|工作量|难度|期末|作业|考试).{0,18}(?:怎么样|如何|咋样)(?:[，,。！!]|$)",
)


def review_value(value: str) -> tuple[bool, str]:
    """Keep statements; discard prompts that were collected as questions."""
    text = clean(value)
    if not text:
        return False, "空白单元格"
    if len(text) == 1:
        return False, "内容过短，无法构成评价"
    if "？" in text or "?" in text:
        return False, "提问或征集信息，不作为评价导入"
    if QUESTION_PREFIX.search(text):
        return False, "提问或征集信息，不作为评价导入"
    if QUESTION_LEAD.search(text):
        return False, "提问或征集信息，不作为评价导入"
    if QUESTION_PHRASE.search(text):
        return False, "提问或征集信息，不作为评价导入"
    if re.fullmatch(r"(?:蹲+|老师评价|老师推荐|课程评价|给分|wl|workload)", text, re.I):
        return False, "提问或征集信息，不作为评价导入"
    return True, text[:800]


def stable_author_id(source_row: int, source_column: int, code: str, instructor: str, content: str) -> str:
    fingerprint = "|".join(map(str, (source_row, source_column, code, instructor, content)))
    return "legacy:" + hashlib.sha256(fingerprint.encode("utf-8")).hexdigest()[:40]


def write_csv(path: Path, rows: list[dict], fields: list[str]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    source = args.source.resolve()
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    df = pd.read_excel(source, header=None)
    names = load_course_names()
    issues: list[dict] = []
    reviews: list[dict] = []
    sports: list[dict] = []
    counts: Counter[str] = Counter()

    for zero_index, row in df.iterrows():
        source_row = zero_index + 1
        raw_code = clean(row.iloc[0])
        raw_instructor = clean(row.iloc[1]) if len(row) > 1 else ""
        sport_key = raw_instructor.casefold()
        # The worksheet also contains one older generic PED1001 record whose
        # activity cell says “shuttlecock”.  It is the official PED1112 course,
        # not the generic Physical Education module.
        is_sport = raw_code == "体育" or (raw_code == "PED1001" and sport_key in SPORT_CODES)
        if is_sport:
            sport_name = raw_instructor
            code = SPORT_CODES.get(sport_name) or SPORT_CODES.get(sport_key)
            if not code:
                issues.append({
                    "source_row": source_row, "source_column": "B", "level": "rejected",
                    "reason": "未在当前官方体育课程目录核实到该项目的真实课程编号，未猜测导入",
                    "raw_course_code": raw_code, "raw_instructor": raw_instructor, "raw_value": sport_name,
                    "normalized_value": "",
                })
                counts["unmapped_sports"] += 1
                continue
            codes, instructors = [code], [UNKNOWN_INSTRUCTOR]
            names[code] = SPORT_NAMES[code]
            if raw_code != "体育":
                issues.append({
                    "source_row": source_row, "source_column": "A", "level": "info",
                    "reason": "按活动名称将泛体育代码映射为官方具体体育课程编号", "raw_course_code": raw_code,
                    "raw_instructor": raw_instructor, "raw_value": raw_code, "normalized_value": code,
                })
            sports.append({"source_row": source_row, "sport_name": sport_name, "course_code": code, "status": "mapped"})
            content_start = 2
        else:
            codes, notices = split_codes(raw_code)
            for level, reason in notices:
                issues.append({
                    "source_row": source_row, "source_column": "A", "level": level, "reason": reason,
                    "raw_course_code": raw_code, "raw_instructor": raw_instructor, "raw_value": raw_code,
                    "normalized_value": "|".join(codes),
                })
            if not codes:
                if raw_code and not notices:
                    issues.append({
                        "source_row": source_row, "source_column": "A", "level": "rejected",
                        "reason": "缺少可识别的课程编号，无法可靠关联到课程", "raw_course_code": raw_code,
                        "raw_instructor": raw_instructor, "raw_value": raw_code, "normalized_value": "",
                    })
                continue
            instructors = split_instructors(raw_instructor)
            if instructors == [UNKNOWN_INSTRUCTOR]:
                issues.append({
                    "source_row": source_row, "source_column": "B", "level": "warning",
                    "reason": "教师缺失，使用占位值以保留课程与评价", "raw_course_code": raw_code,
                    "raw_instructor": raw_instructor, "raw_value": "", "normalized_value": UNKNOWN_INSTRUCTOR,
                })
            content_start = 2

        for column in range(content_start, len(row)):
            raw_content = clean(row.iloc[column])
            keep, result = review_value(raw_content)
            if not raw_content:
                continue
            column_letter = chr(ord("A") + column) if column < 26 else str(column + 1)
            if not keep:
                issues.append({
                    "source_row": source_row, "source_column": column_letter, "level": "filtered",
                    "reason": result, "raw_course_code": raw_code, "raw_instructor": raw_instructor,
                    "raw_value": raw_content, "normalized_value": "",
                })
                counts["filtered_cells"] += 1
                continue
            for code in codes:
                for instructor in instructors:
                    target = names.get(code, f"{code}（课程名称待补充）")
                    reviews.append({
                        "author_id": stable_author_id(source_row, column, code, instructor, result),
                        "target_type": "course",
                        "target_id": f"cuhksz_course_{code.lower()}",
                        "target": target,
                        "context": f"{instructor} · {HISTORICAL_TERM}",
                        "rating": None,
                        "content": result,
                        "status": "published",
                        "is_historical": True,
                        "instructor": instructor,
                        "term": HISTORICAL_TERM,
                        "course_code": code,
                        "source_row": source_row,
                        "source_column": column_letter,
                        "source_workbook": source.name,
                    })
                    counts["accepted_reviews"] += 1

    review_fields = [
        "author_id", "target_type", "target_id", "target", "context", "rating", "content", "status",
        "is_historical", "instructor", "term", "course_code", "source_row", "source_column", "source_workbook",
    ]
    issue_fields = ["source_row", "source_column", "level", "reason", "raw_course_code", "raw_instructor", "raw_value", "normalized_value"]
    write_csv(output / "reviews.csv", reviews, review_fields)
    write_csv(output / "cleaning_issues.csv", issues, issue_fields)
    write_csv(output / "sports_course_mapping.csv", sports, ["source_row", "sport_name", "course_code", "status"])
    (output / "reviews-import.json").write_text(json.dumps(reviews, ensure_ascii=False, indent=2), encoding="utf-8")
    summary = [{"metric": key, "value": value} for key, value in [
        ("source_rows", len(df)),
        ("accepted_reviews", len(reviews)),
        ("accepted_course_codes", len({review["course_code"] for review in reviews})),
        ("mapped_sport_rows", len(sports)),
        ("unmapped_sport_rows", counts["unmapped_sports"]),
        ("filtered_cells", counts["filtered_cells"]),
        ("issues", len(issues)),
    ]]
    write_csv(output / "cleaning_summary.csv", summary, ["metric", "value"])
    print(json.dumps({"source": str(source), **{row["metric"]: row["value"] for row in summary}}, ensure_ascii=False))


if __name__ == "__main__":
    main()
