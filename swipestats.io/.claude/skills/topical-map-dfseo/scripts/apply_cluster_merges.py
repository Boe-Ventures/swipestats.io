#!/usr/bin/env python3
"""
Phase 5.5: Apply Cluster Merges.

Takes merge decisions from the LLM cluster_merger sub-agent and applies them
to clusters.json. Absorbed clusters are folded into their keep cluster:
- Secondary keywords are combined
- Volumes are summed
- Difficulty/CPC are averaged
- Gap/snippet flags are OR'd
- Trend uses the keep cluster's value

Also generates a compact keyword list for the merge sub-agent (prep mode).

Usage:
    # Step 1: Generate compact list for LLM
    echo '{"clusters_file": "clusters.json", "mode": "prep", "output_dir": "./"}' | python3 apply_cluster_merges.py

    # Step 2: Apply merge decisions
    echo '{"clusters_file": "clusters.json", "merges_file": "merge_groups.json", "mode": "apply", "output_dir": "./"}' | python3 apply_cluster_merges.py

Input JSON (prep mode):
    {
        "clusters_file": "clusters.json",
        "mode": "prep",
        "output_dir": "./"
    }

Input JSON (apply mode):
    {
        "clusters_file": "clusters.json",
        "merges_file": "merge_groups.json",
        "mode": "apply",
        "output_dir": "./"
    }
"""

import json
import sys
from pathlib import Path
from collections import defaultdict


def parse_cluster_id(cid):
    """Extract numeric cluster ID from 'c_42' or 42 format."""
    if isinstance(cid, int):
        return cid
    if isinstance(cid, str):
        if cid.startswith("c_"):
            return int(cid[2:])
        return int(cid)
    raise ValueError(f"Cannot parse cluster_id: {cid}")


def prep_mode(clusters_file, output_dir):
    """Generate compact keyword list for the LLM merger sub-agent."""
    with open(clusters_file) as f:
        data = json.load(f)
    clusters = data.get("clusters", data)

    lines = []
    for c in clusters:
        lines.append(f"c_{c['cluster_id']}: {c['primary_keyword']}")

    output_file = Path(output_dir) / "cluster_list_for_merge.txt"
    with open(output_file, "w") as f:
        f.write("\n".join(lines))

    summary = {
        "total_clusters": len(clusters),
        "output_file": str(output_file),
        "file_size_chars": len("\n".join(lines)),
        "estimated_tokens": len("\n".join(lines)) // 4,
    }
    print(json.dumps({"success": True, "mode": "prep", "summary": summary}, indent=2))


def apply_mode(clusters_file, merges_file, output_dir):
    """Apply merge decisions to clusters.json."""
    with open(clusters_file) as f:
        data = json.load(f)
    clusters_list = data.get("clusters", data)

    with open(merges_file) as f:
        merges_data = json.load(f)
    merge_groups = merges_data.get("merge_groups", [])

    # Build cluster lookup by numeric ID
    cluster_lookup = {}
    for c in clusters_list:
        cluster_lookup[c["cluster_id"]] = c

    # Build absorb set (clusters that will be folded into others)
    absorb_set = set()
    # Map from absorbed cluster_id to keep cluster_id
    absorb_to_keep = {}

    for group in merge_groups:
        try:
            keep_id = parse_cluster_id(group["keep"])
        except (ValueError, TypeError, KeyError):
            sys.stderr.write(f"Warning: Could not parse keep id in group: {group.get('keep')}\n")
            continue

        for absorbed_cid in group.get("absorb", []):
            try:
                abs_id = parse_cluster_id(absorbed_cid)
                absorb_set.add(abs_id)
                absorb_to_keep[abs_id] = keep_id
            except (ValueError, TypeError):
                sys.stderr.write(f"Warning: Could not parse absorbed id: {absorbed_cid}\n")

    sys.stderr.write(f"Merge groups: {len(merge_groups)}, clusters to absorb: {len(absorb_set)}\n")

    # Apply merges
    merged_count = 0
    missing_keep = 0
    missing_absorb = 0

    for group in merge_groups:
        try:
            keep_id = parse_cluster_id(group["keep"])
        except (ValueError, TypeError, KeyError):
            continue

        keep_cluster = cluster_lookup.get(keep_id)
        if not keep_cluster:
            sys.stderr.write(f"Warning: Keep cluster {keep_id} not found\n")
            missing_keep += 1
            continue

        for absorbed_cid in group.get("absorb", []):
            try:
                abs_id = parse_cluster_id(absorbed_cid)
            except (ValueError, TypeError):
                continue

            absorbed = cluster_lookup.get(abs_id)
            if not absorbed:
                missing_absorb += 1
                continue

            # Fold absorbed cluster into keep cluster
            # 1. Add primary keyword of absorbed as secondary
            if absorbed["primary_keyword"] not in keep_cluster.get("secondary_keywords", []):
                keep_cluster.setdefault("secondary_keywords", []).append(absorbed["primary_keyword"])

            # 2. Add absorbed secondaries too
            for sk in absorbed.get("secondary_keywords", []):
                if sk not in keep_cluster.get("secondary_keywords", []):
                    keep_cluster.setdefault("secondary_keywords", []).append(sk)

            # 3. Sum volumes
            keep_cluster["combined_volume"] = (keep_cluster.get("combined_volume") or 0) + (absorbed.get("combined_volume") or 0)

            # 4. Keyword count
            keep_cluster["keyword_count"] = (keep_cluster.get("keyword_count") or 1) + (absorbed.get("keyword_count") or 1)

            # 5. OR flags
            if absorbed.get("has_featured_snippet"):
                keep_cluster["has_featured_snippet"] = True
            if absorbed.get("contains_gap_keywords"):
                keep_cluster["contains_gap_keywords"] = True

            # 6. Merge categories
            keep_cats = set(keep_cluster.get("categories", []))
            abs_cats = set(absorbed.get("categories", []))
            keep_cluster["categories"] = list(keep_cats | abs_cats)

            # 7. CPC - take the max
            keep_cpc = keep_cluster.get("max_cpc") or 0
            abs_cpc = absorbed.get("max_cpc") or 0
            if abs_cpc > keep_cpc:
                keep_cluster["max_cpc"] = abs_cpc

            merged_count += 1

    # Build output: filter out absorbed clusters
    merged_clusters = []
    for c in clusters_list:
        if c["cluster_id"] not in absorb_set:
            merged_clusters.append(c)

    # Re-sort by combined volume (descending)
    merged_clusters.sort(key=lambda c: c.get("combined_volume", 0), reverse=True)

    # Save output
    output_file = Path(output_dir) / "clusters_merged.json"
    output_data = {
        "clusters": merged_clusters,
    }

    # Preserve category_groups if present, recalculated
    if "category_groups" in data:
        category_groups = defaultdict(lambda: {"cluster_ids": [], "combined_volume": 0})
        for cluster in merged_clusters:
            for cat in cluster.get("categories", []):
                category_groups[cat]["cluster_ids"].append(cluster["cluster_id"])
                category_groups[cat]["combined_volume"] += cluster["combined_volume"]
        output_data["category_groups"] = {str(k): v for k, v in category_groups.items()}

    with open(output_file, "w") as f:
        json.dump(output_data, f, indent=2)

    summary = {
        "clusters_before": len(clusters_list),
        "merge_groups_applied": len(merge_groups),
        "clusters_absorbed": merged_count,
        "clusters_after": len(merged_clusters),
        "reduction_pct": round((1 - len(merged_clusters) / len(clusters_list)) * 100, 1) if clusters_list else 0,
        "missing_keep_clusters": missing_keep,
        "missing_absorbed_clusters": missing_absorb,
        "output_file": str(output_file),
    }

    print(json.dumps({"success": True, "mode": "apply", "summary": summary}, indent=2))


def main():
    if sys.stdin.isatty():
        print(json.dumps({"error": "No input provided. Pipe JSON via stdin."}))
        sys.exit(1)

    try:
        config = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON input: {e}"}))
        sys.exit(1)

    mode = config.get("mode", "apply")
    clusters_file = config.get("clusters_file")
    output_dir = config.get("output_dir", ".")
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    if not clusters_file:
        print(json.dumps({"error": "Missing clusters_file"}))
        sys.exit(1)

    if mode == "prep":
        prep_mode(clusters_file, output_dir)
    elif mode == "apply":
        merges_file = config.get("merges_file")
        if not merges_file:
            print(json.dumps({"error": "Missing merges_file for apply mode"}))
            sys.exit(1)
        apply_mode(clusters_file, merges_file, output_dir)
    else:
        print(json.dumps({"error": f"Unknown mode: {mode}. Use 'prep' or 'apply'."}))
        sys.exit(1)


if __name__ == "__main__":
    main()
