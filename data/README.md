# Question Bank data

Every question in `data/questions/*.json` and the taxonomy in `data/manifest.json`
is imported directly from the **College Board SAT Suite Question Bank**
(the public bank at <https://satsuitequestionbank.collegeboard.org>). Nothing here
is authored by PeakPoint — the importer pulls the official prompts, answer choices,
correct answers, and explanations verbatim.

## Contents

- `manifest.json` — subject → domain → skill tree with the real question count and
  the data-file slug for each skill. The Question Bank page renders from this file.
- `questions/<skill-slug>.json` — one array of questions per skill. Each question:

  ```json
  {
    "id": "df5d8531-…",        // College Board external_id (or IBN for released items)
    "questionId": "84b5125b",
    "skillCd": "WIC",
    "skill": "Words in Context",
    "domain": "Craft and Structure",
    "difficulty": "Easy | Medium | Hard",
    "type": "mcq | spr",         // spr = student-produced response (grid-in)
    "passage": "<p>…</p>",       // stimulus HTML (may be empty)
    "prompt": "<p>…</p>",        // question stem HTML
    "choices": [{ "letter": "A", "html": "<p>…</p>" }],
    "answer": "B",               // correct letter for mcq
    "answerText": "102",         // accepted value(s) for spr
    "rationale": "<p>…</p>"      // official explanation HTML
  }
  ```

Math renders through the browser's native MathML (`<math>`) and, for released-test
items, inline base64 images — no extra libraries required.

## Regenerating

```bash
python3 scripts/scrape_collegeboard.py            # pull everything (~3,400 questions)
python3 scripts/scrape_collegeboard.py --limit 3  # quick smoke test (3 per skill)
```

The importer is resumable-friendly (it overwrites per-skill files) and rate-limited.
Re-run it whenever College Board updates the bank.
