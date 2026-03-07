#!/usr/bin/env python3
"""
Phase 8: Clean up output folder — move working files to _working/ subfolder.

Keeps only deliverables in the main folder:
- strategy.md
- page-plan.csv
- keyword-mapping.csv
- topical-map-diagram.md
- topical-map.html
- topical-map.json

Everything else (intermediate JSON files, raw data, config) goes to _working/.

Usage:
    echo '{"output_dir": "./output"}' | python3 cleanup_folder.py
"""

import json
import sys
import shutil
from pathlib import Path

DELIVERABLES = {
    "strategy.md",
    "page-plan.csv",
    "keyword-mapping.csv",
    "topical-map-diagram.md",
    "topical-map.html",
    "topical-map.json",
}


def main():
    if sys.stdin.isatty():
        print(json.dumps({"error": "No input provided. Pipe JSON via stdin."}))
        sys.exit(1)

    try:
        config = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON input: {e}"}))
        sys.exit(1)

    output_dir = config.get("output_dir")
    if not output_dir:
        print(json.dumps({"error": "Missing required field: output_dir"}))
        sys.exit(1)

    output_path = Path(output_dir)
    if not output_path.exists():
        print(json.dumps({"error": f"Directory does not exist: {output_dir}"}))
        sys.exit(1)

    working_dir = output_path / "_working"
    working_dir.mkdir(exist_ok=True)

    moved = []
    kept = []

    for item in sorted(output_path.iterdir()):
        # Skip the _working directory itself
        if item.name == "_working":
            continue

        if item.name in DELIVERABLES:
            kept.append(item.name)
        else:
            dest = working_dir / item.name
            if item.is_dir():
                if dest.exists():
                    shutil.rmtree(dest)
                shutil.move(str(item), str(dest))
            else:
                shutil.move(str(item), str(dest))
            moved.append(item.name)

    print(json.dumps({
        "deliverables_kept": kept,
        "moved_to_working": moved,
        "working_dir": str(working_dir),
    }, indent=2))


if __name__ == "__main__":
    main()
