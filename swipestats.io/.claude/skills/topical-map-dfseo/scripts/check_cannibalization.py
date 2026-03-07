#!/usr/bin/env python3
"""
Phase 5.5: Cannibalization Prevention.

Cross-references keyword clusters against existing page rankings.
Annotates each cluster as new_opportunity, strengthen_existing, or cannibalization_risk.

Usage:
    echo '{"clusters_file": "./output/clusters.json", "existing_pages_file": "./output/existing_pages.json", "output_dir": "./output"}' | python3 check_cannibalization.py

Input JSON:
    {
        "clusters_file": "./output/clusters.json",
        "existing_pages_file": "./output/existing_pages.json",
        "output_dir": "./output"
    }
"""

import json
import sys
from pathlib import Path
from difflib import SequenceMatcher


def keyword_similarity(a: str, b: str) -> float:
    """Calculate string similarity between two keywords."""
    return SequenceMatcher(None, a.lower().strip(), b.lower().strip()).ratio()


def find_matching_page(keyword: str, existing_pages: list, threshold: float = 0.8) -> dict | None:
    """
    Find an existing page that ranks for a keyword similar to the given one.
    Returns the matching page dict or None.
    """
    kw_lower = keyword.lower().strip()
    for page in existing_pages:
        # Check against page rankings (keywords the page currently ranks for)
        for ranking in page.get("rankings", []):
            ranked_kw = ranking.get("keyword", "")
            position = ranking.get("position", 999)
            if position > 30:
                continue
            if keyword_similarity(kw_lower, ranked_kw) >= threshold:
                return {
                    "url": page.get("url", ""),
                    "matched_keyword": ranked_kw,
                    "position": position,
                    "similarity": round(keyword_similarity(kw_lower, ranked_kw), 2),
                }
        # Also check page URL slug as fallback
        url = page.get("url", "")
        slug = url.rstrip("/").split("/")[-1].replace("-", " ").lower() if url else ""
        if slug and keyword_similarity(kw_lower, slug) >= threshold:
            return {
                "url": url,
                "matched_keyword": f"[url slug: {slug}]",
                "position": None,
                "similarity": round(keyword_similarity(kw_lower, slug), 2),
            }
    return None


def classify_cluster(cluster: dict, existing_pages: list) -> dict:
    """
    Classify a cluster's cannibalization status.

    Checks primary keyword + top 5 secondary keywords against existing pages.
    Returns the cluster dict with cannibalization annotation added.
    """
    primary = cluster.get("primary_keyword", "")
    secondaries = cluster.get("secondary_keywords", [])[:5]

    primary_match = find_matching_page(primary, existing_pages)
    secondary_matches = []
    for kw in secondaries:
        match = find_matching_page(kw, existing_pages)
        if match:
            secondary_matches.append({"keyword": kw, **match})

    # Classification logic
    if primary_match:
        if primary_match.get("position") and primary_match["position"] <= 10:
            status = "strengthen_existing"
        else:
            status = "cannibalization_risk"
        existing_url = primary_match["url"]
    elif len(secondary_matches) >= 2:
        status = "cannibalization_risk"
        existing_url = secondary_matches[0]["url"]
    elif len(secondary_matches) == 1:
        status = "strengthen_existing"
        existing_url = secondary_matches[0]["url"]
    else:
        status = "new_opportunity"
        existing_url = None

    cluster["cannibalization"] = {
        "status": status,
        "existing_url": existing_url,
        "primary_match": primary_match,
        "secondary_matches": secondary_matches,
    }
    return cluster


def main():
    if sys.stdin.isatty():
        print(json.dumps({"error": "No input provided. Pipe JSON via stdin."}))
        sys.exit(1)

    try:
        config = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON input: {e}"}))
        sys.exit(1)

    clusters_file = config.get("clusters_file")
    existing_pages_file = config.get("existing_pages_file")
    output_dir = config.get("output_dir", ".")

    if not clusters_file or not existing_pages_file:
        print(json.dumps({"error": "Missing clusters_file or existing_pages_file"}))
        sys.exit(1)

    Path(output_dir).mkdir(parents=True, exist_ok=True)

    # Load data
    try:
        with open(clusters_file) as f:
            clusters_data = json.load(f)
            clusters = clusters_data.get("clusters", clusters_data) if isinstance(clusters_data, dict) else clusters_data
    except Exception as e:
        print(json.dumps({"error": f"Failed to load clusters: {e}"}))
        sys.exit(1)

    try:
        with open(existing_pages_file) as f:
            pages_data = json.load(f)
            existing_pages = pages_data.get("pages", pages_data) if isinstance(pages_data, dict) else pages_data
    except Exception as e:
        print(json.dumps({"error": f"Failed to load existing pages: {e}"}))
        sys.exit(1)

    if not existing_pages:
        # No existing pages — everything is a new opportunity
        for cluster in clusters:
            cluster["cannibalization"] = {
                "status": "new_opportunity",
                "existing_url": None,
                "primary_match": None,
                "secondary_matches": [],
            }
    else:
        sys.stderr.write(f"Checking {len(clusters)} clusters against {len(existing_pages)} existing pages...\n")
        for cluster in clusters:
            classify_cluster(cluster, existing_pages)

    # Save annotated clusters
    output_file = Path(output_dir) / "clusters_annotated.json"
    with open(output_file, "w") as f:
        json.dump(clusters, f, indent=2)

    # Summary stats
    counts = {"new_opportunity": 0, "strengthen_existing": 0, "cannibalization_risk": 0}
    for cluster in clusters:
        status = cluster.get("cannibalization", {}).get("status", "new_opportunity")
        counts[status] = counts.get(status, 0) + 1

    summary = {
        "total_clusters": len(clusters),
        "existing_pages_checked": len(existing_pages),
        **counts,
    }

    print(json.dumps({
        "summary": summary,
        "output_files": {"clusters_annotated": str(output_file)},
    }, indent=2))


if __name__ == "__main__":
    main()
