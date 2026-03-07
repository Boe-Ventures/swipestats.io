#!/usr/bin/env python3
"""
Phase 2: Keyword Harvesting via competitor mining + gap analysis.

Harvests actual keyword portfolios from competitors, plus explicit
gaps (keywords they rank for that target doesn't).

Supports two modes:
1. Keywords-first (legacy): Get ALL keywords from competitors
2. Pages-first (recommended): Get keywords only for specific page URLs

Usage:
    echo '{"target_domain": "example.com", "competitors": [...], ...}' | python3 harvest_keywords.py

Input JSON:
    {
        "target_domain": "example.com",
        "competitors": [
            {"domain": "comp1.com", "intersections": 450},
            {"domain": "comp2.com", "intersections": 300}
        ],
        "location": "United States",
        "language": "English",
        "keywords_per_competitor": 500,
        "max_keywords": 5000,
        "excluded_patterns": ["salary", "resume", "jobs"],
        "top_n_for_gap": 5,
        "output_dir": "./output",

        # Pages-first mode (optional):
        "page_urls": {
            "comp1.com": ["/blog/discount-guide", "/bogo-offers"],
            "comp2.com": ["/pricing-strategies"]
        }
    }
"""

import json
import sys
import re
from pathlib import Path
from typing import Dict, Any, List

sys.path.insert(0, str(Path(__file__).parent))
from utils.dataforseo import (
    get_credentials, DataForSEOClient, extract_api_error,
    extract_keywords_from_response, extract_domain_intersection_keywords
)

# Patterns to auto-exclude (job seekers, navigational, etc.)
EXCLUDE_PATTERNS = [
    r"\b(salary|salaries|hiring|careers?|jobs?|resume|cv|interview|glassdoor)\b",
    r"\b(login|log in|sign in|sign up|signup|download|app store|play store)\b",
    r"\b(stock price|ticker|ipo|investor|annual report)\b",
]

# Template patterns for filtering wrong-audience keywords
AUDIENCE_EXCLUSION_TEMPLATES = {
    "teachers": [
        r"\b(?:classroom|classrooms)\b",
        r"\b(?:teacher|teachers|educator|educators)\b",
        r"\b(?:lesson\s+plan|curriculum|pedagogy)\b",
        r"\b(?:brain\s+break|movement\s+break)\b",
    ],
    "enterprise": [
        r"\b(?:enterprise|fortune\s+500)\b",
        r"\b(?:10k\+|10,000\+)\s*(?:employee|user|seat)\b",
    ],
    "diy": [
        r"\b(?:diy|do\s+it\s+yourself)\b",
        r"\b(?:without\s+(?:hiring|professional))\b",
    ],
    "professionals": [
        r"\b(?:certification|certified|instructor\s+training)\b",
        r"\b(?:cpe|ceu|continuing\s+education)\b",
    ],
}


def is_wrong_audience(keyword: str, exclusions: List[str], custom_patterns: List[str] = None) -> bool:
    """Check if keyword targets an excluded audience."""
    kw_lower = keyword.lower()
    for audience in exclusions:
        for pattern in AUDIENCE_EXCLUSION_TEMPLATES.get(audience, []):
            if re.search(pattern, kw_lower):
                return True
    for pattern in (custom_patterns or []):
        if re.search(pattern, kw_lower, re.IGNORECASE):
            return True
    return False


def is_excluded(keyword: str, custom_patterns: List[str] = None) -> bool:
    """Check if keyword matches exclusion patterns."""
    kw_lower = keyword.lower()
    for pattern in EXCLUDE_PATTERNS:
        if re.search(pattern, kw_lower):
            return True
    for pattern in (custom_patterns or []):
        if pattern.lower() in kw_lower:
            return True
    return False


def main():
    if sys.stdin.isatty():
        print(json.dumps({"error": "No input provided. Pipe JSON via stdin."}))
        sys.exit(1)

    try:
        config = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON input: {e}"}))
        sys.exit(1)

    target_domain = config.get("target_domain")
    competitors = config.get("competitors", [])
    if not target_domain or not competitors:
        print(json.dumps({"error": "Missing target_domain or competitors"}))
        sys.exit(1)

    location = config.get("location", "United States")
    language = config.get("language", "English")
    kw_per_competitor = config.get("keywords_per_competitor", 500)
    max_keywords = config.get("max_keywords", 5000)
    excluded_patterns = config.get("excluded_patterns", [])
    top_n_for_gap = config.get("top_n_for_gap", 5)
    output_dir = config.get("output_dir", ".")
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    # Audience exclusion settings
    audience_exclusions = config.get("audience_exclusions", [])
    custom_exclusion_patterns = config.get("custom_exclusion_patterns", [])

    # Pages-first mode: optional dict of domain -> [page_urls]
    page_urls_filter = config.get("page_urls", {})
    pages_first_mode = bool(page_urls_filter)

    username, password = get_credentials()
    if not username or not password:
        print(json.dumps({"error": "Missing DataForSEO credentials"}))
        sys.exit(1)

    client = DataForSEOClient(username, password)

    # Deduplicated keyword store: keyword_lower -> {keyword data}
    all_keywords = {}
    source_counts = {}
    errors = []
    excluded_wrong_audience = 0

    # Step 1: Extract ranked_keywords from each competitor
    for comp in competitors:
        domain = comp.get("domain", "")
        if not domain:
            continue

        # Check if we have URL filter for this domain (pages-first mode)
        allowed_urls = page_urls_filter.get(domain, [])
        if pages_first_mode and allowed_urls:
            sys.stderr.write(f"Extracting keywords from {domain} (filtered to {len(allowed_urls)} pages)...\n")
        else:
            sys.stderr.write(f"Extracting keywords from {domain}...\n")

        response = client.ranked_keywords(
            domain, location, language, limit=kw_per_competitor,
            filters=["ranked_serp_element.serp_item.rank_absolute", "<", 50]
        )
        error = extract_api_error(response)
        if error:
            sys.stderr.write(f"  Error for {domain}: {error}\n")
            errors.append({"domain": domain, "error": error})
            continue

        keywords = extract_keywords_from_response(response)
        count = 0
        url_filtered = 0
        for kw in keywords:
            kw_lower = kw["keyword"].lower().strip()
            if not kw_lower or is_excluded(kw_lower, excluded_patterns):
                continue
            if is_wrong_audience(kw_lower, audience_exclusions, custom_exclusion_patterns):
                excluded_wrong_audience += 1
                continue

            # Pages-first filtering: only keep keywords from allowed URLs
            if pages_first_mode and allowed_urls:
                kw_url = kw.get("url", "")
                if kw_url:
                    # Extract path from full URL
                    from urllib.parse import urlparse
                    kw_path = urlparse(kw_url).path
                    # Check if path matches any allowed URL
                    if not any(allowed in kw_path or kw_path in allowed for allowed in allowed_urls):
                        url_filtered += 1
                        continue

            if kw_lower not in all_keywords or (kw.get("search_volume") or 0) > (all_keywords[kw_lower].get("search_volume") or 0):
                all_keywords[kw_lower] = {
                    "keyword": kw["keyword"],
                    "search_volume": kw.get("search_volume") or 0,
                    "cpc": kw.get("cpc") or 0,
                    "competition": kw.get("competition") or 0,
                    "source": domain,
                    "is_gap": False,
                }
                count += 1

        source_counts[domain] = count
        if pages_first_mode and allowed_urls:
            sys.stderr.write(f"  Got {count} keywords from allowed pages ({url_filtered} filtered by URL)\n")
        else:
            sys.stderr.write(f"  Got {count} new keywords from {domain}\n")

    # Step 2: Gap analysis — domain_intersection for top N competitors
    gap_keywords_count = 0
    gap_competitors = sorted(competitors, key=lambda c: c.get("intersections", 0), reverse=True)[:top_n_for_gap]

    for comp in gap_competitors:
        domain = comp.get("domain", "")
        if not domain:
            continue

        sys.stderr.write(f"Gap analysis: {target_domain} vs {domain}...\n")
        response = client.domain_intersection(
            target_domain=target_domain, competitor_domain=domain,
            location=location, language=language, limit=500,
            gap_mode=True
        )
        error = extract_api_error(response)
        if error:
            sys.stderr.write(f"  Gap error for {domain}: {error}\n")
            errors.append({"domain": domain, "error": error, "type": "gap"})
            continue

        gap_kws = extract_domain_intersection_keywords(response)
        count = 0
        for kw in gap_kws:
            kw_lower = kw["keyword"].lower().strip()
            if not kw_lower or is_excluded(kw_lower, excluded_patterns):
                continue
            if is_wrong_audience(kw_lower, audience_exclusions, custom_exclusion_patterns):
                excluded_wrong_audience += 1
                continue
            if kw_lower not in all_keywords:
                all_keywords[kw_lower] = {
                    "keyword": kw["keyword"],
                    "search_volume": kw.get("search_volume") or 0,
                    "cpc": kw.get("cpc") or 0,
                    "competition": kw.get("competition") or 0,
                    "source": f"gap:{domain}",
                    "is_gap": True,
                }
                count += 1
            elif kw_lower in all_keywords:
                # Mark as gap even if already found
                all_keywords[kw_lower]["is_gap"] = True

        gap_keywords_count += count
        source_counts[f"gap:{domain}"] = count
        sys.stderr.write(f"  Found {count} gap keywords vs {domain}\n")

    # Step 3: Enforce max_keywords limit (keep highest volume)
    keyword_list = sorted(all_keywords.values(), key=lambda k: k.get("search_volume") or 0, reverse=True)
    if len(keyword_list) > max_keywords:
        keyword_list = keyword_list[:max_keywords]

    # Save output
    output_file = Path(output_dir) / "raw_keywords.json"
    with open(output_file, "w") as f:
        json.dump(keyword_list, f, indent=2)

    # Summary
    gap_count = sum(1 for k in keyword_list if k.get("is_gap"))
    summary = {
        "total_raw": len(all_keywords),
        "after_limit": len(keyword_list),
        "gap_keywords": gap_count,
        "excluded_wrong_audience": excluded_wrong_audience,
        "sources": source_counts,
        "errors": errors,
        "total_volume": sum(k.get("search_volume") or 0 for k in keyword_list),
    }

    print(json.dumps({
        "summary": summary,
        "output_files": {"raw_keywords": str(output_file)},
    }, indent=2))


if __name__ == "__main__":
    main()
