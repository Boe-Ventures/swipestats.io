#!/usr/bin/env python3
"""
Phase 4: Keyword Enrichment via keyword_overview (single endpoint).

Replaces v4's 3 separate calls (bulk_search_volume + bulk_keyword_difficulty +
search_intent) with ONE endpoint that returns everything: volume, CPC, difficulty,
intent, SERP features, core_keyword, monthly trends, categories.

Usage:
    echo '{"keywords_file": "raw_keywords.json", ...}' | python3 enrich_keywords.py

Input JSON:
    {
        "keywords_file": "raw_keywords.json",
        "location": "United States",
        "language": "English",
        "min_volume": 0,
        "output_dir": "./output"
    }
"""

import json
import sys
from pathlib import Path
from typing import Dict, Any, List
from collections import Counter

sys.path.insert(0, str(Path(__file__).parent))
from utils.dataforseo import (
    get_credentials, DataForSEOClient, extract_api_error,
    extract_keyword_overview_data
)

BATCH_SIZE = 700


def main():
    if sys.stdin.isatty():
        print(json.dumps({"error": "No input provided. Pipe JSON via stdin."}))
        sys.exit(1)

    try:
        config = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON input: {e}"}))
        sys.exit(1)

    keywords_file = config.get("keywords_file")
    if not keywords_file:
        print(json.dumps({"error": "Missing keywords_file"}))
        sys.exit(1)

    location = config.get("location", "United States")
    language = config.get("language", "English")
    min_volume = config.get("min_volume", 0)
    output_dir = config.get("output_dir", ".")
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    # Load keywords
    with open(keywords_file) as f:
        raw_keywords = json.load(f)

    sys.stderr.write(f"Loaded {len(raw_keywords)} keywords for enrichment\n")

    # Build lookup for preserving source/gap info
    kw_metadata = {}
    for kw in raw_keywords:
        kw_lower = kw["keyword"].lower().strip()
        kw_metadata[kw_lower] = {
            "source": kw.get("source", ""),
            "is_gap": kw.get("is_gap", False),
        }

    # Deduplicate keyword strings
    unique_keywords = list({kw["keyword"].lower().strip(): kw["keyword"] for kw in raw_keywords if kw.get("keyword")}.values())
    sys.stderr.write(f"Unique keywords to enrich: {len(unique_keywords)}\n")

    username, password = get_credentials()
    if not username or not password:
        print(json.dumps({"error": "Missing DataForSEO credentials"}))
        sys.exit(1)

    client = DataForSEOClient(username, password)

    # Enrich in batches of 700
    enriched = []
    errors = []
    for i in range(0, len(unique_keywords), BATCH_SIZE):
        batch = unique_keywords[i:i + BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        total_batches = (len(unique_keywords) + BATCH_SIZE - 1) // BATCH_SIZE
        sys.stderr.write(f"Enriching batch {batch_num}/{total_batches} ({len(batch)} keywords)...\n")

        response = client.keyword_overview(batch, location, language)
        error = extract_api_error(response)
        if error:
            sys.stderr.write(f"  Error in batch {batch_num}: {error}\n")
            errors.append({"batch": batch_num, "error": error})
            continue

        batch_data = extract_keyword_overview_data(response)
        for kw in batch_data:
            kw_lower = kw["keyword"].lower().strip()
            # Merge with original metadata
            meta = kw_metadata.get(kw_lower, {})
            kw["source"] = meta.get("source", "")
            kw["is_gap"] = meta.get("is_gap", False)

            # Calculate opportunity score
            vol = kw.get("search_volume", 0) or 0
            diff = kw.get("difficulty", 0) or 0
            kw["opportunity_score"] = round(vol * (100 - diff) / 100) if vol else 0

            # Featured snippet opportunity
            kw["featured_snippet_opportunity"] = "featured_snippet" in (kw.get("serp_features") or [])

            enriched.append(kw)

    # Filter zero-volume if min_volume > 0
    if min_volume > 0:
        before = len(enriched)
        enriched = [k for k in enriched if (k.get("search_volume") or 0) >= min_volume]
        sys.stderr.write(f"Filtered {before - len(enriched)} keywords below volume {min_volume}\n")

    # Sort by opportunity score
    enriched.sort(key=lambda k: k.get("opportunity_score", 0), reverse=True)

    # Save
    output_file = Path(output_dir) / "enriched_keywords.json"
    with open(output_file, "w") as f:
        json.dump(enriched, f, indent=2)

    # Summary stats
    intent_dist = Counter(k.get("intent", "unknown") for k in enriched)
    trend_dist = Counter(k.get("trend", "stable") for k in enriched)
    core_keywords = {k.get("core_keyword", "").lower() for k in enriched if k.get("core_keyword")}
    snippet_count = sum(1 for k in enriched if k.get("featured_snippet_opportunity"))
    gap_count = sum(1 for k in enriched if k.get("is_gap"))
    zero_vol = sum(1 for k in enriched if not k.get("search_volume"))

    # Navigational keyword warnings
    nav_keywords = [k for k in enriched if k.get("intent") == "navigational"]
    nav_count = len(nav_keywords)
    if nav_count > 0:
        sys.stderr.write(f"\nNavigational keywords: {nav_count} found (will get 0.3x priority multiplier in architect)\n")
        high_vol_nav = [k for k in nav_keywords if (k.get("search_volume") or 0) >= 1000]
        if high_vol_nav:
            sys.stderr.write(f"  High-volume navigational keywords (>1K vol) — likely unrankable brand searches:\n")
            for k in sorted(high_vol_nav, key=lambda x: x.get("search_volume") or 0, reverse=True)[:10]:
                sys.stderr.write(f"    - \"{k['keyword']}\" (vol: {k.get('search_volume', 0):,})\n")

    summary = {
        "input_keywords": len(raw_keywords),
        "enriched_keywords": len(enriched),
        "zero_volume_in_result": zero_vol,
        "total_search_volume": sum((k.get("search_volume") or 0) for k in enriched),
        "avg_difficulty": round(sum((k.get("difficulty") or 0) for k in enriched) / len(enriched), 1) if enriched else 0,
        "intent_distribution": dict(intent_dist),
        "trend_distribution": dict(trend_dist),
        "core_keyword_groups": len(core_keywords),
        "featured_snippet_opportunities": snippet_count,
        "gap_keywords": gap_count,
        "navigational_keywords": nav_count,
        "errors": errors,
    }

    print(json.dumps({
        "summary": summary,
        "output_files": {"enriched_keywords": str(output_file)},
    }, indent=2))


if __name__ == "__main__":
    main()
