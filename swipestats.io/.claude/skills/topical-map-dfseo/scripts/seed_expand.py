#!/usr/bin/env python3
"""
Phase 2b: Seed Expansion for niche/emerging terms.

Expands original seed queries to catch terms no competitor covers.
Runs AFTER competitor keyword harvesting (Phase 2).

Uses:
- related_keywords (depth=2) — topically related terms
- keyword_suggestions — long-tail variations containing the seed

Usage:
    echo '{"seed_keywords": ["geo optimization", ...], ...}' | python3 seed_expand.py

Input JSON:
    {
        "seed_keywords": ["geo optimization", "ai search seo", ...],
        "existing_keywords_file": "./output/raw_keywords.json",
        "location": "United States",
        "language": "English",
        "depth": 2,
        "output_dir": "./output"
    }
"""

import json
import sys
from pathlib import Path
from typing import Dict, Any, Set, List

sys.path.insert(0, str(Path(__file__).parent))
from utils.dataforseo import (
    get_credentials, DataForSEOClient, extract_api_error,
    extract_related_keywords, extract_keyword_suggestions
)


def generate_core_topic_seeds(core_topics: List[str], audience: str = None) -> List[str]:
    """Generate seed queries for core business topics.

    Args:
        core_topics: List of core product/service topics (e.g., ["dinosaur yoga mat", "unicorn yoga mat"])
        audience: Optional audience type for additional templates (e.g., "parents", "smb", "local")

    Returns:
        List of seed queries generated from the core topics
    """
    base_templates = ["{topic}", "best {topic}", "{topic} guide"]
    audience_templates = {
        "parents": ["{topic} for kids", "{topic} for toddlers", "{topic} for children"],
        "smb": ["{topic} for small business", "{topic} pricing", "{topic} for startups"],
        "local": ["{topic} near me", "{topic} company", "{topic} services"],
        "ecommerce": ["buy {topic}", "{topic} online", "{topic} reviews"],
    }
    seeds = []
    templates = base_templates + audience_templates.get(audience, [])
    for topic in core_topics:
        for template in templates:
            seeds.append(template.format(topic=topic))
    return seeds


def main():
    if sys.stdin.isatty():
        print(json.dumps({"error": "No input provided. Pipe JSON via stdin."}))
        sys.exit(1)

    try:
        config = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON input: {e}"}))
        sys.exit(1)

    seed_keywords = config.get("seed_keywords", [])
    core_topics = config.get("core_topics", [])
    audience_type = config.get("audience_type")

    # Generate additional seeds from core topics
    if core_topics:
        core_seeds = generate_core_topic_seeds(core_topics, audience_type)
        # Add core topic seeds to the beginning (prioritized)
        seed_keywords = core_seeds + [s for s in seed_keywords if s not in core_seeds]
        sys.stderr.write(f"Added {len(core_seeds)} seeds from {len(core_topics)} core topics\n")

    if not seed_keywords:
        print(json.dumps({"error": "No seed_keywords or core_topics provided"}))
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
    from_suggestions = 0

    # Step 1: related_keywords for each seed (topically related terms)
    for seed in seed_keywords[:20]:
        sys.stderr.write(f"Related keywords for: {seed} (depth={depth})...\n")
        response = client.related_keywords(seed, location, language, depth=depth, limit=300)
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
                "source": f"related:{seed}",
                "is_gap": False,
            }
            count += 1
        from_related += count
        sys.stderr.write(f"  Found {count} new keywords\n")

    # Step 2: keyword_suggestions for top seeds (long-tail containing the seed)
    for seed in seed_keywords[:10]:
        sys.stderr.write(f"Keyword suggestions for: {seed}...\n")
        response = client.keyword_suggestions(seed, location, language, limit=500)
        error = extract_api_error(response)
        if error:
            sys.stderr.write(f"  Error: {error}\n")
            continue

        suggestions = extract_keyword_suggestions(response)
        count = 0
        for kw in suggestions:
            kw_lower = kw["keyword"].lower().strip()
            if not kw_lower or kw_lower in existing_kws or kw_lower in new_keywords:
                continue
            new_keywords[kw_lower] = {
                "keyword": kw["keyword"],
                "search_volume": kw.get("search_volume") or 0,
                "cpc": kw.get("cpc") or 0,
                "competition": kw.get("competition") or 0,
                "source": f"suggestions:{seed}",
                "is_gap": False,
            }
            count += 1
        from_suggestions += count
        sys.stderr.write(f"  Found {count} new keywords\n")

    # Save expanded keywords
    keyword_list = sorted(new_keywords.values(), key=lambda k: k.get("search_volume") or 0, reverse=True)
    output_file = Path(output_dir) / "seed_expanded_keywords.json"
    with open(output_file, "w") as f:
        json.dump(keyword_list, f, indent=2)

    summary = {
        "seed_keywords_used": len(seed_keywords[:20]),
        "new_keywords_found": len(keyword_list),
        "from_related": from_related,
        "from_suggestions": from_suggestions,
        "top_new_keywords": [k["keyword"] for k in keyword_list[:20]],
    }

    print(json.dumps({
        "summary": summary,
        "output_files": {"seed_expanded_keywords": str(output_file)},
    }, indent=2))


if __name__ == "__main__":
    main()
