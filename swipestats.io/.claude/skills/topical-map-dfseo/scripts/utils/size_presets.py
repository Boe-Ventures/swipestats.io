#!/usr/bin/env python3
"""
Map size presets for topical-map-dfseo1.

Controls parameters across the entire pipeline based on user's
desired map scope: small (focused), medium (balanced), large (comprehensive).
"""

PRESETS = {
    "small": {
        "target_pages": "30-60",
        "max_competitors": 3,
        "keywords_per_competitor": 300,
        "max_keywords": 1500,
        "top_n_for_gap": 2,
        "gap_limit": 500,
        "expansion": "skip",
        "expand_depth": 0,
        "estimated_cost": "~$2",
    },
    "medium": {
        "target_pages": "60-150",
        "max_competitors": 5,
        "keywords_per_competitor": 600,
        "max_keywords": 3000,
        "top_n_for_gap": 3,
        "gap_limit": 800,
        "expansion": "1_round",
        "expand_depth": 2,
        "estimated_cost": "~$4",
    },
    "large": {
        "target_pages": "150-300",
        "max_competitors": 8,
        "keywords_per_competitor": 1000,
        "max_keywords": 5000,
        "top_n_for_gap": 5,
        "gap_limit": 1000,
        "expansion": "full",
        "expand_depth": 3,
        "estimated_cost": "~$6",
    },
}


def get_preset(size: str) -> dict:
    """Get preset parameters for a given map size. Defaults to medium."""
    return PRESETS.get(size.lower(), PRESETS["medium"]).copy()
