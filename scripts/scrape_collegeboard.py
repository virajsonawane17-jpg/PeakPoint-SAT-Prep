#!/usr/bin/env python3
"""
PeakPoint SAT Prep — College Board Question Bank scraper
========================================================

Pulls every question from the College Board SAT Suite Question Bank
(the same public bank at satsuitequestionbank.collegeboard.org) and
writes normalized JSON that the PeakPoint frontend loads directly.

Two public endpoints are used:
  * get-questions : lists question metadata for a subject + domain
  * get-question  : returns full content for one question

Questions come in two shapes:
  * "external_id" items  -> fields: stimulus / stem / answerOptions / correct_answer / rationale
  * "ibn" items (released -> fields: prompt / answer{choices,correct_choice,rationale}
     test forms)            (the IBN string is passed in the external_id field)

Both shapes are normalized to a single schema (see normalize()).

Output:
  data/questions/<skill-slug>.json   one array of questions per skill
  data/manifest.json                 taxonomy + real counts for the UI

Usage:
  python3 scripts/scrape_collegeboard.py            # scrape everything
  python3 scripts/scrape_collegeboard.py --limit 3  # 3 questions/skill (smoke test)
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

API = "https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital"
LIST_URL = API + "/get-questions"
DETAIL_URL = API + "/get-question"

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "data", "questions")
MANIFEST = os.path.join(ROOT, "data", "manifest.json")

# subject -> test code; domain code -> display name lives in the API response.
# We drive the taxonomy from skill_cd so casing quirks in the API don't matter.
PLAN = [
    ("Reading & Writing", 1, ["INI", "CAS", "EOI", "SEC"]),
    ("Math", 2, ["H", "P", "Q", "S"]),
]

# Canonical display names per skill code (matches PeakPoint's UI copy).
SKILL_NAMES = {
    # Reading & Writing
    "CID": "Central Ideas & Details",
    "INF": "Inferences",
    "COE": "Command of Evidence",
    "WIC": "Words in Context",
    "TSP": "Text Structure & Purpose",
    "CTC": "Cross-Text Connections",
    "SYN": "Rhetorical Synthesis",
    "TRA": "Transitions",
    "BOU": "Boundaries",
    "FSS": "Form, Structure & Sense",
    # Math
    "H.A.": "Linear Equations in One Variable",
    "H.B.": "Linear Functions",
    "H.C.": "Linear Equations in Two Variables",
    "H.D.": "Systems of Two Linear Equations",
    "H.E.": "Linear Inequalities in One or Two Variables",
    "P.A.": "Equivalent Expressions",
    "P.B.": "Nonlinear Equations & Systems",
    "P.C.": "Nonlinear Functions",
    "Q.A.": "Ratios, Rates, Proportions & Units",
    "Q.B.": "Percentages",
    "Q.C.": "One-Variable Data & Distributions",
    "Q.D.": "Two-Variable Data & Scatterplots",
    "Q.E.": "Probability & Conditional Probability",
    "Q.F.": "Inference from Statistics & Margin of Error",
    "Q.G.": "Evaluating Statistical Claims",
    "S.A.": "Area & Volume",
    "S.B.": "Lines, Angles & Triangles",
    "S.C.": "Right Triangles & Trigonometry",
    "S.D.": "Circles",
}

DIFF = {"E": "Easy", "M": "Medium", "H": "Hard"}
LETTERS = ["A", "B", "C", "D", "E", "F"]

# Some released-test (IBN) items omit correct_choice; the answer is only
# stated in the rationale ("Choice C is correct" / "Choice C is the best answer").
_CHOICE_RE = re.compile(r"choice\s+([A-D])\s+is\s+(?:the\s+best\s+answer|correct)", re.IGNORECASE)


def answer_from_rationale(rationale):
    if not rationale:
        return ""
    m = _CHOICE_RE.search(re.sub(r"<[^>]+>", " ", rationale))
    return m.group(1).upper() if m else ""


# IBN grid-ins state the value only in the rationale ("The correct answer is 360.").
_SPR_RE = re.compile(
    r"correct answers?\s+(?:is|are)\s+(?:either\s+)?"
    r"([0-9][0-9./\-]*(?:\s*(?:,|or)\s*[0-9][0-9./\-]*)*)",
    re.IGNORECASE,
)


def spr_answer_from_rationale(rationale):
    if not rationale:
        return ""
    text = re.sub(r"<[^>]+>", " ", rationale)
    m = _SPR_RE.search(text)
    if not m:
        return ""
    parts = re.split(r"\s*(?:,|or)\s*", m.group(1))
    return ", ".join(p.strip() for p in parts if p.strip())


def slugify(skill_cd):
    return skill_cd.lower().replace(".", "").strip() or "misc"


def post(url, body, retries=4):
    data = json.dumps(body).encode()
    last = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                url, data=data,
                headers={
                    "Content-Type": "application/json",
                    "Origin": "https://satsuitequestionbank.collegeboard.org",
                    "User-Agent": "Mozilla/5.0 PeakPoint-QBank-Importer",
                },
            )
            with urllib.request.urlopen(req, timeout=45) as r:
                return json.load(r)
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError) as e:
            last = e
            time.sleep(0.6 * (attempt + 1))
    raise RuntimeError(f"request failed after {retries} tries: {last}")


def list_domain(test, domain):
    return post(LIST_URL, {"asmtEventId": 99, "test": test, "domain": domain})


def fetch_detail(meta):
    """Fetch + normalize one question. Returns dict or None on failure."""
    ext = meta.get("external_id") or meta.get("ibn")
    if not ext:
        return None
    try:
        raw = post(DETAIL_URL, {"external_id": ext})
    except Exception as e:
        sys.stderr.write(f"  ! detail failed {ext}: {e}\n")
        return None
    return normalize(meta, raw)


def normalize(meta, raw):
    skill_cd = meta.get("skill_cd", "")
    common = {
        "id": meta.get("external_id") or meta.get("ibn"),
        "questionId": meta.get("questionId"),
        "skillCd": skill_cd,
        "skill": SKILL_NAMES.get(skill_cd, meta.get("skill_desc", skill_cd)),
        "domain": meta.get("primary_class_cd_desc", ""),
        "difficulty": DIFF.get(meta.get("difficulty"), "Medium"),
    }

    # ----- IBN / released-test shape -----
    if "answer" in raw and isinstance(raw.get("answer"), dict):
        ans = raw["answer"]
        prompt = raw.get("prompt", "") or ""
        choices = []
        answer_letter = ""
        answer_text = ""
        qtype = "mcq"
        if ans.get("choices"):
            for key in sorted(ans["choices"].keys()):
                choices.append({
                    "letter": key.upper(),
                    "html": (ans["choices"][key] or {}).get("body", ""),
                })
            answer_letter = (ans.get("correct_choice") or "").upper()
            if not answer_letter:
                answer_letter = answer_from_rationale(ans.get("rationale", ""))
        else:
            qtype = "spr"
            answer_text = ans.get("correct_answer") or ans.get("key") or ""
            if isinstance(answer_text, list):
                answer_text = ", ".join(map(str, answer_text))
            if not answer_text:
                answer_text = spr_answer_from_rationale(ans.get("rationale", ""))
        common.update({
            "source": "ibn",
            "type": qtype,
            "passage": "",
            "prompt": prompt,
            "choices": choices,
            "answer": answer_letter,
            "answerText": answer_text,
            "rationale": ans.get("rationale", "") or "",
        })
        return common

    # ----- Standard external_id shape -----
    qtype = raw.get("type", "mcq")
    opts = raw.get("answerOptions") or []
    choices = []
    for i, o in enumerate(opts):
        choices.append({"letter": LETTERS[i], "html": o.get("content", "")})
    correct = raw.get("correct_answer") or []
    answer_letter = ""
    answer_text = ""
    if qtype == "mcq" and choices:
        # correct_answer may be a letter, or an option id -> map to letter
        c0 = correct[0] if correct else ""
        if c0 in LETTERS:
            answer_letter = c0
        else:
            ids = [o.get("id") for o in opts]
            answer_letter = LETTERS[ids.index(c0)] if c0 in ids else (c0[:1].upper())
        if not answer_letter:
            answer_letter = answer_from_rationale(raw.get("rationale", ""))
    else:
        qtype = "spr"
        answer_text = ", ".join(map(str, correct))
    common.update({
        "source": "external",
        "type": qtype,
        "passage": raw.get("stimulus", "") or "",
        "prompt": raw.get("stem", "") or "",
        "choices": choices,
        "answer": answer_letter,
        "answerText": answer_text,
        "rationale": raw.get("rationale", "") or "",
    })
    return common


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="max questions per skill (0 = all)")
    ap.add_argument("--workers", type=int, default=8)
    args = ap.parse_args()

    os.makedirs(OUT_DIR, exist_ok=True)
    manifest = {"generated": int(time.time()), "source": "College Board SAT Suite Question Bank",
                "subjects": []}
    grand_total = 0

    for subject, test, domains in PLAN:
        subj_entry = {"name": subject, "test": test, "domains": []}
        for dom in domains:
            metas = list_domain(test, dom)
            dom_name = metas[0].get("primary_class_cd_desc", dom) if metas else dom
            # group metadata by skill code
            by_skill = {}
            for m in metas:
                by_skill.setdefault(m["skill_cd"], []).append(m)

            dom_entry = {"code": dom, "name": dom_name, "skills": []}
            for skill_cd, items in by_skill.items():
                if args.limit:
                    items = items[: args.limit]
                slug = slugify(skill_cd)
                skill_name = SKILL_NAMES.get(skill_cd, items[0].get("skill_desc", skill_cd))
                print(f"[{subject} / {dom_name}] {skill_name} ({skill_cd}) — {len(items)} questions")

                results = []
                with ThreadPoolExecutor(max_workers=args.workers) as ex:
                    futs = {ex.submit(fetch_detail, m): m for m in items}
                    for f in as_completed(futs):
                        r = f.result()
                        if r:
                            results.append(r)
                # stable order: difficulty then id
                order = {"Easy": 0, "Medium": 1, "Hard": 2}
                results.sort(key=lambda x: (order.get(x["difficulty"], 1), x["id"]))

                with open(os.path.join(OUT_DIR, slug + ".json"), "w") as fh:
                    json.dump(results, fh, ensure_ascii=False)
                grand_total += len(results)
                by_diff = {"Easy": 0, "Medium": 0, "Hard": 0}
                for r in results:
                    by_diff[r["difficulty"]] = by_diff.get(r["difficulty"], 0) + 1
                dom_entry["skills"].append({
                    "code": skill_cd, "name": skill_name, "slug": slug,
                    "count": len(results), "byDifficulty": by_diff,
                })
            subj_entry["domains"].append(dom_entry)
        manifest["subjects"].append(subj_entry)

    manifest["total"] = grand_total
    with open(MANIFEST, "w") as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=1)
    print(f"\nDone. {grand_total} questions written to {OUT_DIR}")


if __name__ == "__main__":
    main()
