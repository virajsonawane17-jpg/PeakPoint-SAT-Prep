#!/usr/bin/env python3
"""
Rebuild data/manifest.json from the already-downloaded question files, adding a
per-difficulty breakdown (Easy / Medium / Hard) at the skill, domain, and subject
levels. This is what the Question Bank page uses to show live filtered counts
without loading any question data.

Run after scrape_collegeboard.py (or on its own — it only reads local files):

    python3 scripts/build_manifest.py
"""

import glob
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
Q_DIR = os.path.join(ROOT, "data", "questions")
MANIFEST = os.path.join(ROOT, "data", "manifest.json")

EMPTY = {"Easy": 0, "Medium": 0, "Hard": 0}


def diff_counts(slug):
    path = os.path.join(Q_DIR, slug + ".json")
    counts = dict(EMPTY)
    with open(path) as fh:
        data = json.load(fh)
    for q in data:
        d = q.get("difficulty", "Medium")
        counts[d] = counts.get(d, 0) + 1
    return counts, len(data)


def add(dst, src):
    for k, v in src.items():
        dst[k] = dst.get(k, 0) + v


def main():
    with open(MANIFEST) as fh:
        manifest = json.load(fh)

    grand = 0
    for subj in manifest["subjects"]:
        s_diff = dict(EMPTY)
        s_total = 0
        for dom in subj["domains"]:
            d_diff = dict(EMPTY)
            d_total = 0
            for sk in dom["skills"]:
                bd, n = diff_counts(sk["slug"])
                sk["byDifficulty"] = bd
                sk["count"] = n
                add(d_diff, bd)
                d_total += n
            dom["byDifficulty"] = d_diff
            dom["count"] = d_total
            add(s_diff, d_diff)
            s_total += d_total
        subj["byDifficulty"] = s_diff
        subj["count"] = s_total
        grand += s_total

    manifest["total"] = grand
    with open(MANIFEST, "w") as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=1)
    print(f"Manifest rebuilt: {grand} questions with difficulty breakdown.")


if __name__ == "__main__":
    main()
