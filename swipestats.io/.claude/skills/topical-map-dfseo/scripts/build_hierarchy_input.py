#!/usr/bin/env python3
"""
Phase 6b-prep: Build Hierarchy Builder Input.

Correctly assembles hierarchy_builder_input.json by looking up clusters
by cluster_id (not array index). Fixes the off-by-one bug that occurred
when the main agent built this file manually.

Usage:
    # Combined format (dfseo2 — topic_mapper outputs topics + assignments in one file):
    echo '{
        "topic_mapper_file": "topic_mapper_output.json",
        "clusters_file": "clusters.json",
        "business_context": {...},
        "site_type": "local_service",
        "map_size": "medium",
        "output_dir": "./"
    }' | python3 build_hierarchy_input.py

    # Legacy format (separate topics + assignments files):
    echo '{
        "topics_file": "topics_discovered.json",
        "assignments_file": "topic_assignments_merged.json",
        "clusters_file": "clusters.json",
        "business_context": {...},
        "site_type": "local_service",
        "map_size": "medium",
        "output_dir": "./"
    }' | python3 build_hierarchy_input.py

Input JSON:
    {
        "topic_mapper_file": "topic_mapper_output.json",  # OR topics_file + assignments_file
        "clusters_file": "clusters.json",
        "business_context": {
            "description": "...",
            "target_audience": "...",
            "primary_goal": "...",
            "offerings": [...],
            "non_offerings": [...]
        },
        "site_type": "local_service",
        "map_size": "medium",
        "output_dir": "./"
    }

Output:
    hierarchy_builder_input.json — correctly structured input for hierarchy_builder.md
"""

import json
import sys
from pathlib import Path
from collections import defaultdict


def parse_cluster_id(cid) -> int:
    """Extract numeric cluster ID from 'c_42' or 42 format."""
    if isinstance(cid, int):
        return cid
    if isinstance(cid, str):
        if cid.startswith("c_"):
            return int(cid[2:])
        return int(cid)
    raise ValueError(f"Cannot parse cluster_id: {cid}")


def main():
    if sys.stdin.isatty():
        print(json.dumps({"error": "No input provided. Pipe JSON via stdin."}))
        sys.exit(1)

    try:
        config = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON input: {e}"}))
        sys.exit(1)

    # File inputs — supports combined (topic_mapper_file) or separate (topics_file + assignments_file)
    topic_mapper_file = config.get("topic_mapper_file")
    topics_file = config.get("topics_file")
    assignments_file = config.get("assignments_file")
    clusters_file = config.get("clusters_file")

    if not clusters_file:
        print(json.dumps({"error": "Missing required: clusters_file"}))
        sys.exit(1)

    if not topic_mapper_file and not all([topics_file, assignments_file]):
        print(json.dumps({"error": "Provide either topic_mapper_file OR both topics_file + assignments_file"}))
        sys.exit(1)

    # Optional config
    business_context = config.get("business_context", {})
    site_type = config.get("site_type", "business")
    map_size = config.get("map_size", "medium")
    output_dir = Path(config.get("output_dir", "."))
    output_dir.mkdir(parents=True, exist_ok=True)

    # Load files
    if topic_mapper_file:
        # Combined format: single file has both topics and assignments
        with open(topic_mapper_file) as f:
            mapper_data = json.load(f)
        topics_data = mapper_data
        assignments_data = mapper_data
    else:
        # Legacy format: separate files
        with open(topics_file) as f:
            topics_data = json.load(f)
        with open(assignments_file) as f:
            assignments_data = json.load(f)

    with open(clusters_file) as f:
        clusters_data = json.load(f)

    # Extract data
    topics_list = topics_data.get("topics", [])
    assignments = assignments_data.get("assignments", [])
    clusters_raw = clusters_data.get("clusters", clusters_data)

    # Build cluster lookup by cluster_id (THE KEY FIX)
    cluster_lookup = {}
    for cluster in clusters_raw:
        cid = cluster.get("cluster_id")
        if cid is not None:
            cluster_lookup[cid] = cluster

    sys.stderr.write(f"Loaded {len(topics_list)} topics, {len(assignments)} assignments, {len(cluster_lookup)} clusters\n")

    # Build topic_id -> list of assignments mapping
    topic_assignments = defaultdict(list)
    off_topic_clusters = []

    for assignment in assignments:
        if assignment.get("is_off_topic"):
            off_topic_clusters.append(assignment)
            continue

        topic_id = assignment.get("topic_id")
        if topic_id is not None:
            topic_assignments[topic_id].append(assignment)

    sys.stderr.write(f"On-topic assignments: {sum(len(v) for v in topic_assignments.values())}, Off-topic: {len(off_topic_clusters)}\n")

    # Build topics dict for hierarchy builder
    topics_output = {}
    missing_clusters = 0

    for topic in topics_list:
        topic_id = topic.get("topic_id")
        topic_name = topic.get("name", f"topic_{topic_id}")

        assigned = topic_assignments.get(topic_id, [])
        if not assigned:
            continue  # Skip topics with no assignments

        # Look up full cluster data for each assigned cluster
        clusters_for_topic = []
        for assignment in assigned:
            raw_cid = assignment.get("cluster_id")
            try:
                cid = parse_cluster_id(raw_cid)
            except (ValueError, TypeError):
                sys.stderr.write(f"Warning: Could not parse cluster_id '{raw_cid}'\n")
                missing_clusters += 1
                continue

            cluster = cluster_lookup.get(cid)
            if not cluster:
                sys.stderr.write(f"Warning: Cluster {cid} not found in clusters.json\n")
                missing_clusters += 1
                continue

            # Build cluster object for hierarchy builder
            clusters_for_topic.append({
                "cluster_id": f"c_{cid}",
                "primary_keyword": cluster.get("primary_keyword", ""),
                "secondary_keywords": cluster.get("secondary_keywords", []),
                "combined_volume": cluster.get("combined_volume", 0),
                "avg_difficulty": cluster.get("avg_difficulty", 0),
                "dominant_intent": cluster.get("dominant_intent", "unknown"),
                "contains_gap_keywords": cluster.get("contains_gap_keywords", False),
                "trend": cluster.get("trend", "stable"),
                "has_featured_snippet": cluster.get("has_featured_snippet", False),
                "keyword_count": cluster.get("keyword_count", 1),
            })

        if not clusters_for_topic:
            continue

        # Calculate topic-level stats
        combined_volume = sum(c.get("combined_volume", 0) for c in clusters_for_topic)

        topics_output[topic_name] = {
            "topic_id": topic_id,
            "description": topic.get("description", ""),
            "funnel_stage": topic.get("funnel_stage", "awareness"),
            "cluster_ids": [c["cluster_id"] for c in clusters_for_topic],
            "clusters": clusters_for_topic,
            "combined_volume": combined_volume,
            "cluster_count": len(clusters_for_topic),
        }

    if missing_clusters > 0:
        sys.stderr.write(f"Warning: {missing_clusters} clusters could not be resolved\n")

    # Build final output
    output = {
        "topics": topics_output,
        "site_type": site_type,
        "map_size": map_size,
        "business_context": business_context,
        "off_topic_count": len(off_topic_clusters),
    }

    # Save output
    output_file = output_dir / "hierarchy_builder_input.json"
    with open(output_file, "w") as f:
        json.dump(output, f, indent=2)

    # Summary
    total_clusters_assigned = sum(t["cluster_count"] for t in topics_output.values())
    summary = {
        "topics_with_clusters": len(topics_output),
        "total_clusters_assigned": total_clusters_assigned,
        "off_topic_clusters": len(off_topic_clusters),
        "missing_clusters": missing_clusters,
        "output_file": str(output_file),
    }

    print(json.dumps({
        "success": True,
        "summary": summary,
    }, indent=2))


if __name__ == "__main__":
    main()
