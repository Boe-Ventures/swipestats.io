#!/usr/bin/env python3
"""
Phase 7: Generate output files from the page plan.

Takes the page plan and keyword mapping and generates:
- strategy.md - Phased growth plan
- page-plan.csv - One row per page with all metrics
- keyword-mapping.csv - Every keyword mapped to a page
- topical-map-diagram.md - Mermaid showing page hierarchy

Usage:
    echo '{"page_plan": [...], "keyword_mapping": [...], ...}' | python3 generate_outputs.py

Input JSON:
    {
        "page_plan": [...],
        "keyword_mapping": [...],
        "output_dir": "./output",
        "domain": "example.com",
        "site_type": "business",
        "business_context": "SaaS email marketing platform",
        "primary_goal": "lead_generation",
        "competitors_used": ["comp1.com", "comp2.com"]
    }
"""

import json
import sys
import csv
from pathlib import Path
from datetime import datetime
from collections import defaultdict
from typing import List, Dict, Any


def sanitize_mermaid_label(text: str) -> str:
    """Escape text for use in Mermaid labels."""
    text = text.replace('"', "'")
    text = text.replace('[', '(')
    text = text.replace(']', ')')
    text = text.replace('<', '')
    text = text.replace('>', '')
    return text[:45]


def generate_mermaid_diagram(page_plan: List[Dict]) -> str:
    """Generate Mermaid flowchart showing page hierarchy."""
    lines = ["flowchart TD"]
    lines.append("")
    lines.append("    %% Styling")
    lines.append("    classDef pillar fill:#4CAF50,stroke:#2E7D32,color:#fff,font-weight:bold")
    lines.append("    classDef cluster fill:#2196F3,stroke:#1565C0,color:#fff")
    lines.append("    classDef supporting fill:#FFF,stroke:#9E9E9E,color:#333")
    lines.append("    classDef faq fill:#FF9800,stroke:#E65100,color:#fff")
    lines.append("    classDef location fill:#9C27B0,stroke:#6A1B9A,color:#fff")
    lines.append("")

    page_lookup = {p["page_id"]: p for p in page_plan}

    type_ids = defaultdict(list)

    for page in page_plan:
        pid = page["page_id"]
        label = sanitize_mermaid_label(page["primary_keyword"].title())
        vol = page.get("combined_volume") or 0
        vol_k = vol / 1000
        vol_str = f"{vol_k:.1f}K" if vol_k >= 1 else str(vol)
        diff = page.get("avg_difficulty") or 0

        node_label = f"{label}\\n({vol_str} vol, D:{diff:.0f})"
        lines.append(f'    {pid}["{node_label}"]')

        ptype = page.get("page_type", "supporting")
        type_ids[ptype].append(pid)

        parent = page.get("parent_page")
        if parent and parent in page_lookup:
            lines.append(f"    {parent} --> {pid}")

    lines.append("")
    lines.append("    %% Apply styles")

    style_map = {
        "pillar": "pillar",
        "cluster": "cluster",
        "supporting": "supporting",
        "faq_hub": "faq",
        "location_template": "location",
    }
    for ptype, style in style_map.items():
        ids = type_ids.get(ptype, [])
        if ids:
            lines.append(f"    class {','.join(ids)} {style}")

    return "\n".join(lines)


def write_page_plan_csv(page_plan: List[Dict], output_path: Path) -> str:
    """Write page plan CSV with one row per page."""
    csv_path = output_path / "page-plan.csv"
    columns = [
        "page_id", "primary_keyword", "secondary_keywords", "page_type",
        "content_format", "funnel_stage", "combined_volume", "avg_difficulty",
        "priority_score", "keyword_count", "parent_page",
        "has_featured_snippet", "contains_gap_keywords", "trend", "description"
    ]

    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=columns, extrasaction='ignore')
        writer.writeheader()

        for page in page_plan:
            row = {
                "page_id": page.get("page_id", ""),
                "primary_keyword": page.get("primary_keyword", ""),
                "secondary_keywords": "; ".join(page.get("secondary_keywords", [])),
                "page_type": page.get("page_type", ""),
                "content_format": page.get("content_format", ""),
                "funnel_stage": page.get("funnel_stage", ""),
                "combined_volume": page.get("combined_volume") or 0,
                "avg_difficulty": page.get("avg_difficulty") or 0,
                "priority_score": page.get("priority_score") or 0,
                "keyword_count": page.get("keyword_count") or 0,
                "parent_page": page.get("parent_page", ""),
                "has_featured_snippet": page.get("has_featured_snippet", False),
                "contains_gap_keywords": page.get("contains_gap_keywords", False),
                "trend": page.get("trend", "stable"),
                "description": page.get("description", ""),
            }
            writer.writerow(row)

    return str(csv_path)


def write_keyword_mapping_csv(keyword_mapping: List[Dict], output_path: Path) -> str:
    """Write keyword mapping CSV."""
    csv_path = output_path / "keyword-mapping.csv"
    columns = [
        "keyword", "page_id", "role", "search_volume", "difficulty",
        "intent", "cpc", "is_gap", "serp_features"
    ]

    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=columns, extrasaction='ignore')
        writer.writeheader()
        for entry in keyword_mapping:
            row = dict(entry)
            # Serialize serp_features list to comma-separated string
            sf = row.get("serp_features")
            if isinstance(sf, list):
                row["serp_features"] = ",".join(sf)
            writer.writerow(row)

    return str(csv_path)


def write_mermaid(mermaid_diagram: str, output_path: Path, domain: str = "") -> str:
    """Write Mermaid diagram to markdown file."""
    diagram_path = output_path / "topical-map-diagram.md"

    title = f"Topical Map - {domain}" if domain else "Topical Map - Page Hierarchy"

    content = f"""# {title}

Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}
Data source: DataForSEO Labs API

```mermaid
{mermaid_diagram}
```

## Legend

- **Green**: Pillar pages (broad themes, highest authority)
- **Blue**: Cluster pages (subtopics, link to pillar)
- **White**: Supporting pages (specific targets, link to cluster)
- **Orange**: FAQ hubs
- **Purple**: Location template pages
- Numbers: combined search volume / difficulty score
"""

    with open(diagram_path, 'w', encoding='utf-8') as f:
        f.write(content)

    return str(diagram_path)


HTML_TEMPLATE = r'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Topical Map — %%DOMAIN%%</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #e0e0e0; overflow: hidden; }

#toolbar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  background: rgba(10,10,10,0.95); backdrop-filter: blur(8px);
  padding: 12px 20px; display: flex; align-items: center; gap: 16px;
  border-bottom: 1px solid #222; flex-wrap: wrap;
}
#toolbar h1 { font-size: 16px; font-weight: 600; color: #fff; white-space: nowrap; }
#toolbar .stats { font-size: 13px; color: #888; white-space: nowrap; }
#toolbar .legend { display: flex; gap: 12px; margin-left: auto; }
.legend-item { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #aaa; }
.legend-dot { width: 10px; height: 10px; border-radius: 50%; }
#toolbar button {
  background: #222; border: 1px solid #444; color: #ccc; padding: 5px 12px;
  border-radius: 4px; cursor: pointer; font-size: 12px;
}
#toolbar button:hover { background: #333; color: #fff; }
#search { background: #111; border: 1px solid #333; color: #fff; padding: 5px 10px; border-radius: 4px; font-size: 13px; width: 180px; }
#search::placeholder { color: #555; }

#tooltip {
  position: fixed; pointer-events: none; z-index: 200;
  background: rgba(20,20,20,0.96); border: 1px solid #444; border-radius: 6px;
  padding: 10px 14px; font-size: 13px; line-height: 1.5;
  max-width: 360px; display: none; box-shadow: 0 4px 20px rgba(0,0,0,0.5);
}
#tooltip .tt-kw { font-weight: 600; color: #fff; font-size: 14px; }
#tooltip .tt-type { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 11px; font-weight: 600; margin-left: 6px; }
#tooltip .tt-row { color: #aaa; margin-top: 2px; }
#tooltip .tt-row span { color: #fff; }
#tooltip .tt-badge { display: inline-block; padding: 1px 5px; border-radius: 3px; font-size: 10px; font-weight: 600; margin-left: 4px; }

svg { width: 100vw; height: 100vh; }
</style>
</head>
<body>

<div id="toolbar">
  <h1>%%DOMAIN%% — Topical Map</h1>
  <span class="stats" id="stats"></span>
  <input type="text" id="search" placeholder="Search keywords…">
  <button onclick="resetView()">Reset zoom</button>
  <button onclick="expandAll()">Expand all</button>
  <button onclick="collapseAll()">Collapse to pillars</button>
  <div class="legend">
    <div class="legend-item"><div class="legend-dot" style="background:#4CAF50"></div>Pillar</div>
    <div class="legend-item"><div class="legend-dot" style="background:#2196F3"></div>Cluster</div>
    <div class="legend-item"><div class="legend-dot" style="background:#FF9800"></div>Supporting</div>
    <div class="legend-item"><div class="legend-dot" style="background:#9C27B0"></div>FAQ/Location</div>
  </div>
</div>

<div id="tooltip"></div>
<svg id="chart"></svg>

<script src="https://d3js.org/d3.v7.min.js"></script>
<script>
const rawData = %%JSON_DATA%%;
const domainInfo = %%DOMAIN_INFO%%;

const typeColors = {
  pillar: '#4CAF50', cluster: '#2196F3', supporting: '#FF9800',
  service_page: '#9C27B0', faq_hub: '#00BCD4', location_template: '#795548'
};
const typeLabels = {
  pillar: 'Pillar', cluster: 'Cluster', supporting: 'Supporting',
  service_page: 'Service', faq_hub: 'FAQ', location_template: 'Location'
};

function buildTree(pages) {
  const lookup = {};
  const roots = [];

  pages.forEach(p => {
    if (!p.page_id) return;
    lookup[p.page_id] = { ...p, children: [], _children: null };
  });

  pages.forEach(p => {
    if (!p.page_id) return;
    const node = lookup[p.page_id];
    if (p.parent_page && lookup[p.parent_page]) {
      lookup[p.parent_page].children.push(node);
    } else if (p.page_type === 'pillar') {
      roots.push(node);
    }
  });

  const orphans = pages.filter(p => p.page_id && p.page_type !== 'pillar' && (!p.parent_page || !lookup[p.parent_page]))
    .map(p => lookup[p.page_id]).filter(Boolean);

  Object.values(lookup).forEach(n => {
    n.children.sort((a, b) => (b.combined_volume || 0) - (a.combined_volume || 0));
  });
  roots.sort((a, b) => (b.combined_volume || 0) - (a.combined_volume || 0));

  const root = {
    page_id: 'root', primary_keyword: domainInfo.domain || 'Site', page_type: 'root',
    combined_volume: pages.reduce((s, p) => s + (p.combined_volume || 0), 0),
    avg_difficulty: 0, children: [...roots]
  };

  if (orphans.length > 0) {
    root.children.push({
      page_id: 'orphans', primary_keyword: 'Other (' + orphans.length + ')', page_type: 'cluster',
      combined_volume: orphans.reduce((s, p) => s + (p.combined_volume || 0), 0),
      avg_difficulty: 0, children: orphans
    });
  }

  return root;
}

const treeData = buildTree(rawData.page_plan);

const totalPages = rawData.page_plan.filter(p => p.page_id).length;
const totalVol = rawData.page_plan.reduce((s, p) => s + (p.combined_volume || 0), 0);
const gapPages = rawData.page_plan.filter(p => p.contains_gap_keywords).length;
document.getElementById('stats').textContent =
  totalPages + ' pages · ' + (totalVol/1000).toFixed(0) + 'K volume' + (gapPages ? ' · ' + gapPages + ' gap pages' : '');

const width = window.innerWidth;
const height = window.innerHeight;
const margin = { top: 60, right: 200, bottom: 20, left: 120 };

const svg = d3.select('#chart').attr('width', width).attr('height', height);
const g = svg.append('g');

const zoom = d3.zoom().scaleExtent([0.1, 4]).on('zoom', e => g.attr('transform', e.transform));
svg.call(zoom);
svg.call(zoom.transform, d3.zoomIdentity.translate(margin.left, height / 2).scale(0.8));

const treemap = d3.tree().nodeSize([22, 240]);
const root = d3.hierarchy(treeData, d => d.children);
root.x0 = 0;
root.y0 = 0;

// Start collapsed: only pillars + their direct cluster names visible
root.children?.forEach(pillarNode => {
  pillarNode.children?.forEach(clusterNode => {
    if (clusterNode.children && clusterNode.children.length) {
      clusterNode._children = clusterNode.children;
      clusterNode.children = null;
    }
  });
});

let nodeIdCounter = 0;
const duration = 400;

function update(source) {
  const treeDataLayout = treemap(root);
  const nodes = treeDataLayout.descendants();
  const links = treeDataLayout.links();

  nodes.forEach(d => { d.y = d.depth * 240; });

  const node = g.selectAll('g.node').data(nodes, d => d.id || (d.id = ++nodeIdCounter));

  const nodeEnter = node.enter().append('g')
    .attr('class', 'node')
    .attr('transform', 'translate(' + source.y0 + ',' + source.x0 + ')')
    .on('click', (event, d) => {
      if (d.data.page_type === 'root') return;
      if (d.children) { d._children = d.children; d.children = null; }
      else if (d._children) { d.children = d._children; d._children = null; }
      update(d);
    })
    .on('mouseover', showTooltip)
    .on('mousemove', moveTooltip)
    .on('mouseout', hideTooltip);

  nodeEnter.append('circle')
    .attr('r', 0)
    .style('fill', d => d._children ? getColor(d) : '#111')
    .style('stroke', d => getColor(d))
    .style('stroke-width', d => d.data.page_type === 'pillar' ? 3 : d.data.page_type === 'root' ? 4 : 2)
    .style('cursor', 'pointer');

  nodeEnter.append('text')
    .attr('dy', '.35em')
    .attr('x', d => hasKids(d) ? -12 : 12)
    .attr('text-anchor', d => hasKids(d) ? 'end' : 'start')
    .text(d => trunc(d.data.primary_keyword, 40))
    .style('fill', '#ccc')
    .style('font-size', d => d.data.page_type === 'pillar' ? '13px' : d.data.page_type === 'root' ? '15px' : '11px')
    .style('font-weight', d => (d.data.page_type === 'pillar' || d.data.page_type === 'root') ? '600' : '400')
    .style('cursor', 'pointer');

  // Volume badge
  nodeEnter.append('text')
    .attr('dy', '.35em')
    .attr('x', d => hasKids(d) ? -12 : 12)
    .attr('dx', d => {
      const len = trunc(d.data.primary_keyword, 40).length;
      return hasKids(d) ? -(len * 6 + 8) : (len * 6 + 8);
    })
    .attr('text-anchor', d => hasKids(d) ? 'end' : 'start')
    .text(d => d.data.page_type === 'root' ? '' : fmtVol(d.data.combined_volume))
    .style('fill', '#666').style('font-size', '10px');

  const nodeUpdate = nodeEnter.merge(node);
  nodeUpdate.transition().duration(duration).attr('transform', d => 'translate(' + d.y + ',' + d.x + ')');
  nodeUpdate.select('circle')
    .attr('r', d => d.data.page_type === 'root' ? 8 : d.data.page_type === 'pillar' ? 7 : 5)
    .style('fill', d => d._children ? getColor(d) : '#111')
    .style('stroke', d => getColor(d));

  const nodeExit = node.exit().transition().duration(duration)
    .attr('transform', 'translate(' + source.y + ',' + source.x + ')').remove();
  nodeExit.select('circle').attr('r', 0);
  nodeExit.select('text').style('fill-opacity', 0);

  const link = g.selectAll('path.link').data(links, d => d.target.id);
  const linkEnter = link.enter().insert('path', 'g')
    .attr('class', 'link')
    .attr('d', () => { const o = {x: source.x0, y: source.y0}; return diag(o, o); })
    .style('fill', 'none').style('stroke', '#333').style('stroke-width', 1);

  linkEnter.merge(link).transition().duration(duration).attr('d', d => diag(d.source, d.target));
  link.exit().transition().duration(duration)
    .attr('d', () => { const o = {x: source.x, y: source.y}; return diag(o, o); }).remove();

  nodes.forEach(d => { d.x0 = d.x; d.y0 = d.y; });
}

function diag(s, d) {
  return 'M ' + s.y + ' ' + s.x + ' C ' + (s.y+d.y)/2 + ' ' + s.x + ', ' + (s.y+d.y)/2 + ' ' + d.x + ', ' + d.y + ' ' + d.x;
}
function getColor(d) { return d.data.page_type === 'root' ? '#fff' : (typeColors[d.data.page_type] || '#FF9800'); }
function hasKids(d) { return d.children || d._children; }
function trunc(s, max) { return s && s.length > max ? s.slice(0, max) + '…' : (s || ''); }
function fmtVol(v) { if (!v) return ''; return v >= 1000 ? (v/1000).toFixed(v >= 10000 ? 0 : 1) + 'K' : String(v); }

const tooltip = document.getElementById('tooltip');
function showTooltip(event, d) {
  if (d.data.page_type === 'root') return;
  const data = d.data;
  const color = typeColors[data.page_type] || '#FF9800';
  const label = typeLabels[data.page_type] || data.page_type;
  const childCount = (d.children || d._children || []).length;
  const secs = (data.secondary_keywords || []).slice(0, 5);
  let h = '<div class="tt-kw">' + data.primary_keyword + '<span class="tt-type" style="background:' + color + ';color:#fff">' + label + '</span></div>';
  h += '<div class="tt-row">Volume: <span>' + (data.combined_volume || 0).toLocaleString() + '</span></div>';
  h += '<div class="tt-row">Difficulty: <span>' + (data.avg_difficulty || 0).toFixed(0) + '</span></div>';
  if (data.content_format) h += '<div class="tt-row">Format: <span>' + data.content_format + '</span></div>';
  if (data.funnel_stage) h += '<div class="tt-row">Funnel: <span>' + data.funnel_stage + '</span></div>';
  if (data.trend && data.trend !== 'stable') h += '<div class="tt-row">Trend: <span style="color:' + (data.trend === 'rising' ? '#4CAF50' : '#f44336') + '">' + data.trend + '</span></div>';
  if (data.contains_gap_keywords) h += '<div class="tt-row"><span class="tt-badge" style="background:#E91E63;color:#fff">GAP</span> Competitors rank, you don\'t</div>';
  if (data.has_featured_snippet) h += '<div class="tt-row"><span class="tt-badge" style="background:#2196F3;color:#fff">SNIPPET</span> Featured snippet opportunity</div>';
  if (childCount) h += '<div class="tt-row">Children: <span>' + childCount + ' pages</span></div>';
  if (secs.length) h += '<div class="tt-row" style="margin-top:4px;color:#666">Also targets: ' + secs.join(', ') + '</div>';
  tooltip.innerHTML = h;
  tooltip.style.display = 'block';
}
function moveTooltip(event) {
  tooltip.style.left = Math.min(event.clientX + 15, window.innerWidth - 380) + 'px';
  tooltip.style.top = Math.min(event.clientY - 10, window.innerHeight - 200) + 'px';
}
function hideTooltip() { tooltip.style.display = 'none'; }

function resetView() {
  svg.transition().duration(500).call(zoom.transform,
    d3.zoomIdentity.translate(margin.left, height / 2).scale(0.8));
}
function expandAll() {
  (function ex(d) { if (d._children) { d.children = d._children; d._children = null; } if (d.children) d.children.forEach(ex); })(root);
  update(root);
}
function collapseAll() {
  root.children?.forEach(p => {
    (p.children || p._children || []).forEach(c => {
      if (c.children) { c._children = c.children; c.children = null; }
    });
  });
  update(root);
}

document.getElementById('search').addEventListener('input', function() {
  const q = this.value.toLowerCase().trim();
  if (!q) { g.selectAll('g.node').style('opacity', 1); return; }
  g.selectAll('g.node').style('opacity', d => {
    const kw = (d.data.primary_keyword || '').toLowerCase();
    const secs = (d.data.secondary_keywords || []).join(' ').toLowerCase();
    return (kw.includes(q) || secs.includes(q)) ? 1 : 0.15;
  });
});

// Handle window resize
window.addEventListener('resize', () => {
  svg.attr('width', window.innerWidth).attr('height', window.innerHeight);
});

update(root);
</script>
</body>
</html>'''


def write_html_map(page_plan: List[Dict], output_path: Path, domain: str = "") -> str:
    """Generate interactive HTML topical map with D3.js collapsible tree."""
    html_path = output_path / "topical-map.html"

    json_data = {"page_plan": page_plan}
    domain_info = {"domain": domain}

    html = HTML_TEMPLATE
    html = html.replace('%%DOMAIN%%', domain)
    html = html.replace('%%JSON_DATA%%', json.dumps(json_data, ensure_ascii=False))
    html = html.replace('%%DOMAIN_INFO%%', json.dumps(domain_info, ensure_ascii=False))

    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html)

    return str(html_path)


def write_strategy(
    page_plan: List[Dict],
    keyword_mapping: List[Dict],
    config: Dict,
    output_path: Path
) -> str:
    """Write strategy.md — phased growth plan."""
    strategy_path = output_path / "strategy.md"

    domain = config.get("domain", "")
    site_type = config.get("site_type", "content")
    business_context = config.get("business_context", "")
    primary_goal = config.get("primary_goal", "traffic growth")
    competitors = config.get("competitors_used", [])

    total_pages = len(page_plan)
    total_keywords = len(keyword_mapping)
    total_volume = sum(p.get("combined_volume") or 0 for p in page_plan)
    avg_difficulty = sum(p.get("avg_difficulty") or 0 for p in page_plan) / total_pages if total_pages else 0

    type_counts = defaultdict(int)
    format_counts = defaultdict(int)
    funnel_counts = defaultdict(int)
    for p in page_plan:
        type_counts[p.get("page_type", "other")] += 1
        format_counts[p.get("content_format", "other")] += 1
        funnel_counts[p.get("funnel_stage", "awareness")] += 1

    gap_pages = sum(1 for p in page_plan if p.get("contains_gap_keywords"))
    snippet_pages = sum(1 for p in page_plan if p.get("has_featured_snippet"))
    rising_pages = sum(1 for p in page_plan if p.get("trend") == "rising")
    gap_keywords = sum(1 for k in keyword_mapping if k.get("is_gap"))
    quick_wins = [p for p in page_plan if (p.get("avg_difficulty") or 100) < 40 and (p.get("combined_volume") or 0) > 50]
    quick_wins.sort(key=lambda x: x.get("priority_score") or 0, reverse=True)

    # Sort pages by priority for phase assignment
    sorted_pages = sorted(page_plan, key=lambda p: p.get("priority_score") or 0, reverse=True)

    # Split into phases (roughly: top 15% = phase 1, next 30% = phase 2, rest = phase 3)
    n = len(sorted_pages)
    phase1_cutoff = max(1, int(n * 0.15))
    phase2_cutoff = max(phase1_cutoff + 1, int(n * 0.45))
    phase1_pages = sorted_pages[:phase1_cutoff]
    phase2_pages = sorted_pages[phase1_cutoff:phase2_cutoff]
    phase3_pages = sorted_pages[phase2_cutoff:]

    lines = [
        f"# SEO Content Strategy for {domain}",
        "",
        f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        "Data source: DataForSEO Labs API",
        "",
        "## Executive Summary",
        "",
        f"- **Site:** {domain} ({business_context})",
        f"- **Goal:** {primary_goal.replace('_', ' ').title()}",
        f"- **Total pages planned:** {total_pages}",
        f"- **Total keywords targeted:** {total_keywords:,}",
        f"- **Combined search volume:** {total_volume:,}",
        f"- **Average keyword difficulty:** {avg_difficulty:.1f}",
        f"- **Gap keywords (competitors rank, you don't):** {gap_keywords}",
        f"- **Featured snippet opportunities:** {snippet_pages}",
        f"- **Rising trend topics:** {rising_pages}",
        f"- **Competitors analyzed:** {len(competitors)}",
        "",
        "## Page Structure",
        "",
        f"| Type | Count |",
        f"|------|-------|",
    ]

    for ptype in ["pillar", "cluster", "supporting", "faq_hub", "location_template"]:
        if type_counts.get(ptype, 0) > 0:
            lines.append(f"| {ptype.replace('_', ' ').title()} | {type_counts[ptype]} |")

    lines.extend([
        "",
        "## Content Format Mix",
        "",
        "| Format | Count |",
        "|--------|-------|",
    ])
    for fmt, count in sorted(format_counts.items(), key=lambda x: x[1], reverse=True):
        lines.append(f"| {fmt.replace('_', ' ').title()} | {count} |")

    lines.extend([
        "",
        "## Funnel Distribution",
        "",
        "| Stage | Count |",
        "|-------|-------|",
    ])
    for stage in ["decision", "consideration", "awareness"]:
        if funnel_counts.get(stage, 0) > 0:
            lines.append(f"| {stage.title()} | {funnel_counts[stage]} |")

    lines.extend([
        "",
        "---",
        "",
        "## Growth Phases",
        "",
    ])

    # Phase labels based on site type
    if site_type == "business":
        phase_labels = ["Convert", "Capture", "Educate"]
        phase_months = ["Month 1-2", "Month 3-4", "Month 5-6"]
    else:
        phase_labels = ["Foundation", "Cluster Expansion", "Long-tail Capture"]
        phase_months = ["Month 1-2", "Month 3-4", "Month 5-6"]

    for i, (label, months, pages) in enumerate(zip(phase_labels, phase_months, [phase1_pages, phase2_pages, phase3_pages])):
        if not pages:
            continue
        phase_vol = sum(p.get("combined_volume") or 0 for p in pages)
        phase_gaps = sum(1 for p in pages if p.get("contains_gap_keywords"))
        lines.extend([
            f"### Phase {i+1}: {label} ({months}) — {len(pages)} pages",
            "",
            f"Combined volume: {phase_vol:,} | Gap pages: {phase_gaps}",
            "",
            "| Priority | Page | Volume | Difficulty | Format | Gap | Trend |",
            "|----------|------|--------|------------|--------|-----|-------|",
        ])
        for j, p in enumerate(pages[:15], 1):
            gap_flag = "GAP" if p.get("contains_gap_keywords") else ""
            trend = p.get("trend", "stable")
            lines.append(
                f"| {j} | {p['primary_keyword']} | {p.get('combined_volume', 0):,} | "
                f"{p.get('avg_difficulty', 0):.0f} | {p.get('content_format', '')} | "
                f"{gap_flag} | {trend} |"
            )
        if len(pages) > 15:
            lines.append(f"| ... | *{len(pages) - 15} more pages* | | | | | |")
        lines.append("")

    # Quick wins section
    if quick_wins:
        lines.extend([
            "---",
            "",
            "## Quick Wins (Low Difficulty, High Volume)",
            "",
            "Pages with difficulty < 40 — build these first for fastest traffic gains.",
            "",
            f"**{len(quick_wins)} quick win pages found.**",
            "",
            "| # | Page | Volume | Difficulty | Format | Gap |",
            "|---|------|--------|------------|--------|-----|",
        ])
        for i, p in enumerate(quick_wins[:20], 1):
            gap_flag = "GAP" if p.get("contains_gap_keywords") else ""
            lines.append(
                f"| {i} | {p['primary_keyword']} | {p.get('combined_volume', 0):,} | "
                f"{p.get('avg_difficulty', 0):.0f} | {p.get('content_format', '')} | {gap_flag} |"
            )
        lines.append("")

    # Competitors section
    if competitors:
        lines.extend([
            "---",
            "",
            "## Competitors Analyzed",
            "",
        ])
        for comp in competitors:
            lines.append(f"- {comp}")
        lines.append("")

    with open(strategy_path, 'w', encoding='utf-8') as f:
        f.write("\n".join(lines))

    return str(strategy_path)


def main():
    if sys.stdin.isatty():
        print(json.dumps({"error": "No input provided. Pipe JSON via stdin."}))
        sys.exit(1)

    try:
        config = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON input: {e}"}))
        sys.exit(1)

    page_plan = config.get("page_plan", [])
    keyword_mapping = config.get("keyword_mapping", [])
    output_dir = config.get("output_dir")
    domain = config.get("domain", "")

    if not page_plan:
        print(json.dumps({"error": "No page_plan found in input"}))
        sys.exit(1)

    if not output_dir:
        print(json.dumps({"error": "Missing required field: output_dir"}))
        sys.exit(1)

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    # Generate outputs
    mermaid = generate_mermaid_diagram(page_plan)
    strategy_file = write_strategy(page_plan, keyword_mapping, config, output_path)
    page_plan_csv = write_page_plan_csv(page_plan, output_path)
    keyword_csv = write_keyword_mapping_csv(keyword_mapping, output_path)
    diagram_file = write_mermaid(mermaid, output_path, domain)
    html_file = write_html_map(page_plan, output_path, domain)

    # Write full JSON
    json_path = output_path / "topical-map.json"
    json_data = {
        "page_plan": page_plan,
        "keyword_mapping": keyword_mapping,
        "domain": domain,
        "data_source": "dataforseo_labs",
        "generated": datetime.now().isoformat(),
    }
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(json_data, f, indent=2)

    # Summary
    total_pages = len(page_plan)
    total_keywords = len(keyword_mapping)
    total_volume = sum(p.get("combined_volume") or 0 for p in page_plan)
    avg_difficulty = sum(p.get("avg_difficulty") or 0 for p in page_plan) / total_pages if total_pages else 0
    quick_win_count = sum(1 for p in page_plan if (p.get("avg_difficulty") or 100) < 40 and (p.get("combined_volume") or 0) > 50)
    gap_count = sum(1 for p in page_plan if p.get("contains_gap_keywords"))
    snippet_count = sum(1 for p in page_plan if p.get("has_featured_snippet"))

    type_counts = defaultdict(int)
    for p in page_plan:
        type_counts[p.get("page_type", "other")] += 1

    files_written = {
        "strategy": strategy_file,
        "page_plan_csv": page_plan_csv,
        "keyword_mapping_csv": keyword_csv,
        "diagram": diagram_file,
        "html_map": html_file,
        "json": str(json_path),
    }

    summary = {
        "total_pages": total_pages,
        "total_keywords": total_keywords,
        "total_volume": total_volume,
        "avg_difficulty": round(avg_difficulty, 1),
        "quick_wins": quick_win_count,
        "gap_pages": gap_count,
        "snippet_pages": snippet_count,
        "page_types": dict(type_counts),
        "domain": domain,
    }

    print(json.dumps({
        "files_written": files_written,
        "summary": summary,
    }, indent=2))


if __name__ == "__main__":
    main()
