#!/usr/bin/env python3
"""
Phase 5: Keyword Clustering using core_keyword field (ZERO API calls).

Groups keywords by their DataForSEO core_keyword (synonym grouping).
Falls back to Jaccard string similarity for ungrouped keywords.
Uses categories for higher-level topical grouping.

Adapted from v6's group_and_architect.py — swaps parent_topic for core_keyword.

Usage:
    echo '{"keywords_file": "enriched_keywords.json", ...}' | python3 cluster_keywords.py

Input JSON:
    {
        "keywords_file": "enriched_keywords.json",
        "jaccard_threshold": 0.7,
        "output_dir": "./output"
    }
"""

import json
import sys
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional
from collections import defaultdict


def jaccard_similarity(a: str, b: str) -> float:
    """Word-level Jaccard similarity between two keyword strings."""
    words_a = set(a.lower().split())
    words_b = set(b.lower().split())
    if not words_a or not words_b:
        return 0.0
    return len(words_a & words_b) / len(words_a | words_b)


def group_by_core_keyword(keywords: List[Dict]) -> Tuple[Dict[str, List[Dict]], List[Dict]]:
    """
    Group keywords by core_keyword with transitive merging (union-find).
    Adapted from v6's group_by_parent_topic — swaps parent_topic for core_keyword.
    """
    kw_lookup = {}
    for kw in keywords:
        kw_lookup[kw["keyword"].lower()] = kw

    parent_map = {}

    def find(x):
        while parent_map.get(x, x) != x:
            parent_map[x] = parent_map.get(parent_map[x], parent_map[x])
            x = parent_map[x]
        return x

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            vol_a = kw_lookup.get(ra, {}).get("search_volume") or 0
            vol_b = kw_lookup.get(rb, {}).get("search_volume") or 0
            if vol_a >= vol_b:
                parent_map[rb] = ra
            else:
                parent_map[ra] = rb

    ungrouped = []
    for kw in keywords:
        keyword = kw["keyword"].lower()
        ck = (kw.get("core_keyword") or "").lower()

        if not ck or ck in ("none", "null", ""):
            ungrouped.append(kw)
            continue

        if keyword not in parent_map:
            parent_map[keyword] = keyword

        if ck != keyword:
            if ck not in parent_map:
                parent_map[ck] = ck
            union(keyword, ck)

    groups = defaultdict(list)
    for kw in keywords:
        keyword = kw["keyword"].lower()
        if keyword in parent_map:
            root = find(keyword)
            groups[root].append(kw)

    return dict(groups), ungrouped


def merge_similar_ungrouped(ungrouped: List[Dict], threshold: float = 0.7) -> Tuple[Dict[str, List[Dict]], List[Dict]]:
    """Group ungrouped keywords by Jaccard string similarity."""
    if not ungrouped:
        return {}, []

    ungrouped_sorted = sorted(ungrouped, key=lambda k: k.get("search_volume") or 0, reverse=True)
    assigned = set()
    new_groups = {}
    singletons = []

    for i, kw_a in enumerate(ungrouped_sorted):
        if i in assigned:
            continue
        group_key = kw_a["keyword"].lower()
        group = [kw_a]
        assigned.add(i)

        for j, kw_b in enumerate(ungrouped_sorted):
            if j in assigned:
                continue
            if jaccard_similarity(kw_a["keyword"], kw_b["keyword"]) >= threshold:
                group.append(kw_b)
                assigned.add(j)

        if len(group) > 1:
            new_groups[group_key] = group
        else:
            singletons.append(kw_a)

    return new_groups, singletons


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

    threshold = config.get("jaccard_threshold", 0.7)
    output_dir = config.get("output_dir", ".")
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    with open(keywords_file) as f:
        keywords = json.load(f)

    sys.stderr.write(f"Clustering {len(keywords)} keywords...\n")

    # Step 1: Group by core_keyword
    ck_groups, ungrouped = group_by_core_keyword(keywords)
    sys.stderr.write(f"core_keyword groups: {len(ck_groups)}, ungrouped: {len(ungrouped)}\n")

    # Step 2: Jaccard fallback for ungrouped
    sim_groups, singletons = merge_similar_ungrouped(ungrouped, threshold)
    sys.stderr.write(f"Similarity groups: {len(sim_groups)}, singletons: {len(singletons)}\n")

    # Step 3: Merge all groups
    all_groups = {}
    all_groups.update(ck_groups)
    for key, kws in sim_groups.items():
        if key in all_groups:
            all_groups[key].extend(kws)
        else:
            all_groups[key] = kws
    for kw in singletons:
        key = kw["keyword"].lower()
        if key in all_groups:
            all_groups[key].append(kw)
        else:
            all_groups[key] = [kw]

    # Step 4: Build cluster objects
    clusters = []
    for group_name, group_kws in sorted(
        all_groups.items(),
        key=lambda g: sum(kw.get("search_volume") or 0 for kw in g[1]),
        reverse=True
    ):
        group_kws.sort(key=lambda k: k.get("search_volume") or 0, reverse=True)
        primary = group_kws[0]
        secondaries = group_kws[1:]

        combined_vol = sum(kw.get("search_volume") or 0 for kw in group_kws)
        difficulties = [kw.get("difficulty") or 0 for kw in group_kws if kw.get("difficulty")]
        avg_diff = round(sum(difficulties) / len(difficulties), 1) if difficulties else 0

        cpcs = [kw.get("cpc") or 0 for kw in group_kws if kw.get("cpc")]
        avg_cpc = round(sum(cpcs) / len(cpcs), 2) if cpcs else 0
        max_cpc = round(max(cpcs), 2) if cpcs else 0

        # Dominant intent (volume-weighted)
        intent_vols = defaultdict(int)
        for kw in group_kws:
            intent_vols[kw.get("intent", "unknown")] += kw.get("search_volume") or 0
        dominant_intent = max(intent_vols, key=intent_vols.get) if intent_vols else "unknown"

        # Trend (most common)
        trend_counts = defaultdict(int)
        for kw in group_kws:
            trend_counts[kw.get("trend", "stable")] += 1
        dominant_trend = max(trend_counts, key=trend_counts.get) if trend_counts else "stable"

        # SERP features
        has_snippet = any(kw.get("featured_snippet_opportunity") for kw in group_kws)

        # Gap status
        has_gap = any(kw.get("is_gap") for kw in group_kws)

        # Categories (collect all unique)
        cats = set()
        for kw in group_kws:
            for c in (kw.get("categories") or []):
                cats.add(c)

        clusters.append({
            "cluster_id": len(clusters) + 1,
            "primary_keyword": primary["keyword"],
            "secondary_keywords": [kw["keyword"] for kw in secondaries],
            "combined_volume": combined_vol,
            "avg_difficulty": avg_diff,
            "avg_cpc": avg_cpc,
            "max_cpc": max_cpc,
            "dominant_intent": dominant_intent,
            "keyword_count": len(group_kws),
            "has_featured_snippet": has_snippet,
            "contains_gap_keywords": has_gap,
            "trend": dominant_trend,
            "categories": list(cats),
        })

    # Step 5: Build category groups for pillar-level structure
    category_groups = defaultdict(lambda: {"cluster_ids": [], "combined_volume": 0})
    for cluster in clusters:
        for cat in cluster.get("categories", []):
            category_groups[cat]["cluster_ids"].append(cluster["cluster_id"])
            category_groups[cat]["combined_volume"] += cluster["combined_volume"]

    # Save
    output_file = Path(output_dir) / "clusters.json"
    output_data = {
        "clusters": clusters,
        "category_groups": {str(k): v for k, v in category_groups.items()},
    }
    with open(output_file, "w") as f:
        json.dump(output_data, f, indent=2)

    summary = {
        "total_keywords": len(keywords),
        "core_keyword_groups": len(ck_groups),
        "similarity_groups": len(sim_groups),
        "singleton_keywords": len(singletons),
        "total_clusters": len(clusters),
        "avg_cluster_size": round(len(keywords) / len(clusters), 1) if clusters else 0,
        "category_groups_count": len(category_groups),
    }

    print(json.dumps({
        "summary": summary,
        "output_files": {"clusters": str(output_file)},
    }, indent=2))


if __name__ == "__main__":
    main()
