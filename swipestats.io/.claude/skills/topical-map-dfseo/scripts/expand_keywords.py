#!/usr/bin/env python3
"""
Phase 3: Keyword Expansion for topical gaps (conditional).

Only runs if the main thread identifies topical holes after Phase 2.
Uses related_keywords (Google's related searches graph) + keyword_ideas.

Usage:
    echo '{"seed_topics": ["email deliverability"], ...}' | python3 expand_keywords.py

Input JSON:
    {
        "seed_topics": ["email deliverability", "email authentication"],
        "existing_keywords_file": "raw_keywords.json",
        "location": "United States",
        "language": "English",
        "depth": 2,
        "output_dir": "./output"
    }
"""

import json
import sys
from pathlib import Path
from typing import Dict, Any, List, Set

sys.path.insert(0, str(Path(__file__).parent))
from utils.dataforseo import (
    get_credentials, DataForSEOClient, extract_api_error,
    extract_related_keywords, extract_keywords_from_response
)


def main():
    if sys.stdin.isatty():
        print(json.dumps({"error": "No input provided. Pipe JSON via stdin."}))
        sys.exit(1)

    try:
        config = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON input: {e}"}))
        sys.exit(1)

    seed_topics = config.get("seed_topics", [])
    if not seed_topics:
        print(json.dumps({"error": "No seed_topics provided"}))
        sys.exit(1)

    existing_file = config.get("existing_keywords_file")
    location = config.get("location", "United States")
    language = config.get("language", "English")
    depth = config.get("depth", 2)
    output_dir = config.get("output_dir", ".")
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    username, password = get_credentials()
    if not username or not password:
        print(json.dumps({"error": "Missing DataForSEO credentials"}))
        sys.exit(1)

    client = DataForSEOClient(username, password)

    # Load existing keywords to avoid duplicates
    existing_kws: Set[str] = set()
    if existing_file:
        try:
            with open(existing_file) as f:
                existing = json.load(f)
            existing_kws = {k["keyword"].lower().strip() for k in existing if k.get("keyword")}
            sys.stderr.write(f"Loaded {len(existing_kws)} existing keywords to dedup against\n")
        except Exception as e:
            sys.stderr.write(f"Warning: could not load existing keywords: {e}\n")

    new_keywords = {}
    from_related = 0
    from_ideas = 0

    # Step 1: related_keywords for each seed topic
    for topic in seed_topics[:10]:
        sys.stderr.write(f"Related keywords for: {topic} (depth={depth})...\n")
        response = client.related_keywords(topic, location, language, depth=depth, limit=300)
        error = extract_api_error(response)
        if error:
            sys.stderr.write(f"  Error: {error}\n")
            continue

        related = extract_related_keywords(response)
        count = 0
        for kw in related:
            kw_lower = kw["keyword"].lower().strip()
            if not kw_lower or kw_lower in existing_kws or kw_lower in new_keywords:
                continue
            new_keywords[kw_lower] = {
                "keyword": kw["keyword"],
                "search_volume": kw.get("search_volume") or 0,
                "cpc": kw.get("cpc") or 0,
                "competition": kw.get("competition") or 0,
                "source": f"related:{topic}",
                "is_gap": False,
            }
            count += 1
        from_related += count
        sys.stderr.write(f"  Found {count} new keywords\n")

    # Step 2: keyword_ideas with top related keywords as seeds
    if new_keywords:
        top_seeds = sorted(new_keywords.values(), key=lambda k: k.get("search_volume") or 0, reverse=True)[:200]
        seed_list = [k["keyword"] for k in top_seeds]

        sys.stderr.write(f"Keyword ideas from {len(seed_list)} seeds...\n")
        response = client.keyword_ideas(seed_list, location, language, limit=500)
        error = extract_api_error(response)
        if not error:
            ideas = extract_keywords_from_response(response)
            for kw in ideas:
                kw_lower = kw["keyword"].lower().strip()
                if not kw_lower or kw_lower in existing_kws or kw_lower in new_keywords:
                    continue
                new_keywords[kw_lower] = {
                    "keyword": kw["keyword"],
                    "search_volume": kw.get("search_volume") or 0,
                    "cpc": kw.get("cpc") or 0,
                    "competition": kw.get("competition") or 0,
                    "source": "keyword_ideas",
                    "is_gap": False,
                }
                from_ideas += 1
            sys.stderr.write(f"  Found {from_ideas} new keywords from ideas\n")

    # Save expanded keywords
    keyword_list = sorted(new_keywords.values(), key=lambda k: k.get("search_volume") or 0, reverse=True)
    output_file = Path(output_dir) / "expanded_keywords.json"
    with open(output_file, "w") as f:
        json.dump(keyword_list, f, indent=2)

    summary = {
        "seed_topics": seed_topics,
        "new_keywords_found": len(keyword_list),
        "from_related": from_related,
        "from_ideas": from_ideas,
    }

    print(json.dumps({
        "summary": summary,
        "output_files": {"expanded_keywords": str(output_file)},
    }, indent=2))


if __name__ == "__main__":
    main()
