#!/usr/bin/env python3
"""
Phase 2a: Fetch top pages by organic traffic for a competitor.

Uses DataForSEO relevant_pages endpoint to get pages sorted by ETV.
This is the first step in the pages-first harvesting approach.

Usage:
    echo '{"domain": "competitor.com", ...}' | python3 fetch_top_pages.py

Input JSON:
    {
        "domain": "competitor.com",
        "location": "United States",
        "language": "English",
        "limit": 100,
        "output_dir": "./output"
    }

Output: {domain}_pages.json with page URLs and traffic estimates
"""

import json
import sys
import re
from pathlib import Path
from typing import Dict, Any, List

sys.path.insert(0, str(Path(__file__).parent))
from utils.dataforseo import (
    get_credentials, DataForSEOClient, extract_api_error
)

# URL patterns to auto-skip (almost always off-topic)
AUTO_SKIP_PATTERNS = [
    r'/careers?/?$', r'/jobs?/?$', r'/hiring/?$',           # Careers
    r'/about(-us)?/?$', r'/team/?$', r'/contact/?$',        # Company pages
    r'/privacy', r'/terms', r'/legal', r'/cookie',          # Legal
    r'/login', r'/signup', r'/sign-up', r'/dashboard',      # App pages
    r'/press/', r'/news/.*-raises-', r'/investor',          # PR/funding
    r'/pricing/?$', r'/plans/?$',                           # Pricing (usually thin)
    r'\.(pdf|xml|json)$',                                   # Non-HTML
]


def should_auto_skip(url: str) -> bool:
    """Check if URL matches auto-skip patterns."""
    url_lower = url.lower()
    for pattern in AUTO_SKIP_PATTERNS:
        if re.search(pattern, url_lower):
            return True
    return False


def extract_relevant_pages(response: Dict) -> List[Dict]:
    """Extract page data from relevant_pages response."""
    pages = []
    tasks = response.get("tasks", [])
    if not tasks:
        return pages

    result = tasks[0].get("result", [])
    if not result or not result[0]:
        return pages

    items = result[0].get("items") or []

    for item in items:
        page_url = item.get("page_address", "")
        metrics = item.get("metrics", {}) or {}
        organic = metrics.get("organic", {}) or {}

        pages.append({
            "url": page_url,
            "etv": organic.get("etv", 0),
            "keyword_count": organic.get("count", 0),
            "pos_1_10": organic.get("pos_1", 0) + organic.get("pos_2_3", 0) + organic.get("pos_4_10", 0),
            "pos_11_100": organic.get("pos_11_20", 0) + organic.get("pos_21_30", 0) +
                          organic.get("pos_31_40", 0) + organic.get("pos_41_50", 0) +
                          organic.get("pos_51_60", 0) + organic.get("pos_61_70", 0) +
                          organic.get("pos_71_80", 0) + organic.get("pos_81_90", 0) +
                          organic.get("pos_91_100", 0),
        })

    return pages


def main():
    if sys.stdin.isatty():
        print(json.dumps({"error": "No input provided. Pipe JSON via stdin."}))
        sys.exit(1)

    try:
        config = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON input: {e}"}))
        sys.exit(1)

    domain = config.get("domain")
    if not domain:
        print(json.dumps({"error": "Missing domain"}))
        sys.exit(1)

    location = config.get("location", "United States")
    language = config.get("language", "English")
    limit = config.get("limit", 100)
    output_dir = config.get("output_dir", ".")
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    username, password = get_credentials()
    if not username or not password:
        print(json.dumps({"error": "Missing DataForSEO credentials"}))
        sys.exit(1)

    client = DataForSEOClient(username, password)

    sys.stderr.write(f"Fetching top {limit} pages for {domain}...\n")

    response = client.relevant_pages(
        domain=domain,
        location=location,
        language=language,
        limit=limit
    )

    error = extract_api_error(response)
    if error:
        print(json.dumps({"error": f"API error: {error}"}))
        sys.exit(1)

    pages = extract_relevant_pages(response)

    # Sanity check: if we got pages but all URLs are empty, something is wrong
    if pages and all(not p.get("url") for p in pages):
        print(json.dumps({
            "error": "API returned pages but all URLs are empty. Check API response field names.",
            "hint": "Expected 'page_address' field in response items."
        }))
        sys.exit(1)

    # Split into auto-keep and auto-skip
    kept_pages = []
    skipped_pages = []

    for page in pages:
        url = page["url"]
        if should_auto_skip(url):
            skipped_pages.append({**page, "skip_reason": "auto_pattern"})
        else:
            kept_pages.append(page)

    sys.stderr.write(f"  Found {len(pages)} pages total\n")
    sys.stderr.write(f"  Auto-kept: {len(kept_pages)}, Auto-skipped: {len(skipped_pages)}\n")

    # Save output
    domain_clean = domain.replace(".", "_")
    output_file = Path(output_dir) / f"{domain_clean}_pages.json"

    output_data = {
        "domain": domain,
        "total_pages": len(pages),
        "kept_for_review": len(kept_pages),
        "auto_skipped": len(skipped_pages),
        "pages": kept_pages,
        "skipped": skipped_pages,
    }

    with open(output_file, "w") as f:
        json.dump(output_data, f, indent=2)

    # Summary for stdout
    summary = {
        "domain": domain,
        "total_pages": len(pages),
        "kept_for_review": len(kept_pages),
        "auto_skipped": len(skipped_pages),
        "total_etv": sum(p.get("etv", 0) for p in kept_pages),
        "top_pages": [
            {"url": p["url"], "etv": p["etv"]}
            for p in sorted(kept_pages, key=lambda x: x.get("etv", 0), reverse=True)[:10]
        ],
    }

    print(json.dumps({
        "summary": summary,
        "output_files": {"pages": str(output_file)},
    }, indent=2))


if __name__ == "__main__":
    main()
