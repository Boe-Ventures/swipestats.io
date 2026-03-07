#!/usr/bin/env python3
"""
Phase 0: Extract existing pages from a website.

Fetches sitemap, classifies pages, gets current rankings.
Fixed from v4: properly maps rankings to page URLs.

Usage:
    echo '{"site_url": "https://example.com"}' | python3 extract_existing.py

Input JSON:
    {
        "site_url": "https://example.com",
        "location": "United States",
        "language": "English",
        "output_dir": "./output"
    }
"""

import json
import sys
import re
import requests
from pathlib import Path
from typing import Dict, Any, List, Optional
from urllib.parse import urlparse, urljoin
from collections import Counter
import xml.etree.ElementTree as ET

sys.path.insert(0, str(Path(__file__).parent))
from utils.dataforseo import get_credentials, DataForSEOClient, extract_api_error


def extract_domain(url: str) -> str:
    """Extract clean domain from URL."""
    try:
        if not url.startswith("http"):
            url = f"https://{url}"
        parsed = urlparse(url)
        return parsed.netloc.lower().replace("www.", "")
    except Exception:
        return url.lower().replace("www.", "")


def fetch_sitemap(site_url: str) -> List[str]:
    """Attempt to fetch and parse sitemap.xml."""
    urls = []
    base_url = site_url.rstrip("/")
    headers = {"User-Agent": "Mozilla/5.0 (compatible; TopicalMapBot/1.0)"}
    namespaces = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}

    sitemap_urls = [
        f"{base_url}/sitemap.xml",
        f"{base_url}/sitemap_index.xml",
        f"{base_url}/sitemap-index.xml",
        f"{base_url}/sitemaps/sitemap.xml"
    ]

    for sitemap_url in sitemap_urls:
        try:
            sys.stderr.write(f"Trying sitemap: {sitemap_url}\n")
            response = requests.get(sitemap_url, timeout=10, headers=headers)
            if response.status_code != 200:
                continue

            root = ET.fromstring(response.content)

            # Check if sitemap index
            sitemaps = root.findall(".//sm:sitemap/sm:loc", namespaces) or root.findall(".//sitemap/loc")
            if sitemaps:
                sys.stderr.write(f"Found sitemap index with {len(sitemaps)} sitemaps\n")
                for sm in sitemaps[:5]:
                    try:
                        sm_response = requests.get(sm.text, timeout=10, headers=headers)
                        if sm_response.status_code == 200:
                            sm_root = ET.fromstring(sm_response.content)
                            for url_elem in sm_root.findall(".//sm:url/sm:loc", namespaces) or sm_root.findall(".//url/loc"):
                                if url_elem.text:
                                    urls.append(url_elem.text)
                    except Exception:
                        continue
            else:
                for url_elem in root.findall(".//sm:url/sm:loc", namespaces) or root.findall(".//url/loc"):
                    if url_elem.text:
                        urls.append(url_elem.text)

            if urls:
                sys.stderr.write(f"Found {len(urls)} URLs in sitemap\n")
                return urls

        except Exception as e:
            sys.stderr.write(f"Error parsing {sitemap_url}: {e}\n")
            continue

    return urls


def fetch_robots_txt(site_url: str) -> Optional[str]:
    """Fetch robots.txt to find sitemap URL."""
    try:
        response = requests.get(f"{site_url.rstrip('/')}/robots.txt", timeout=10,
                                headers={"User-Agent": "Mozilla/5.0 (compatible; TopicalMapBot/1.0)"})
        if response.status_code == 200:
            return response.text
    except Exception:
        pass
    return None


def extract_topics_from_urls(urls: List[str]) -> List[str]:
    """Extract topic keywords from URL paths."""
    topics = Counter()
    skip_patterns = ["blog", "page", "post", "article", "category", "tag", "author",
                     "wp-content", "uploads", "images", "assets", "static",
                     r"\d{4}", r"\d{2}"]
    for url in urls:
        try:
            path = urlparse(url).path.strip("/")
            for segment in (s for s in path.split("/") if s and len(s) > 2):
                if any(re.match(p, segment) for p in skip_patterns):
                    continue
                topic = segment.replace("-", " ").replace("_", " ").lower()
                if 3 <= len(topic) <= 50:
                    topics[topic] += 1
        except Exception:
            continue
    return [topic for topic, _ in topics.most_common(20)]


def classify_page_type(url: str) -> str:
    """Classify page type based on URL patterns."""
    path = urlparse(url).path.lower()
    if "/blog" in path or "/news" in path or "/article" in path or "/post" in path:
        return "blog"
    elif "/service" in path or "/product" in path or "/solution" in path:
        return "service"
    elif "/about" in path or "/team" in path or "/contact" in path:
        return "company"
    elif "/pricing" in path or "/plan" in path:
        return "pricing"
    elif "/case-stud" in path or "/customer" in path or "/testimon" in path:
        return "social_proof"
    elif "/resource" in path or "/guide" in path or "/ebook" in path or "/whitepaper" in path:
        return "resource"
    elif "/feature" in path or "/integration" in path:
        return "feature"
    else:
        return "other"


def main():
    if sys.stdin.isatty():
        print(json.dumps({"error": "No input provided. Pipe JSON via stdin."}))
        sys.exit(1)

    try:
        config = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON input: {e}"}))
        sys.exit(1)

    site_url = config.get("site_url")
    if not site_url:
        print(json.dumps({"error": "Missing required field: site_url"}))
        sys.exit(1)

    location = config.get("location", "United States")
    language = config.get("language", "English")
    output_dir = config.get("output_dir", ".")
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    domain = extract_domain(site_url)
    sys.stderr.write(f"Extracting existing pages for: {domain}\n")

    # Step 1: Get sitemap URLs
    urls = fetch_sitemap(site_url)
    if not urls:
        sys.stderr.write("No sitemap found, checking robots.txt...\n")
        robots_txt = fetch_robots_txt(site_url)
        if robots_txt:
            for line in robots_txt.split("\n"):
                if line.lower().startswith("sitemap:"):
                    sm_url = line.split(":", 1)[1].strip()
                    sys.stderr.write(f"Found sitemap in robots.txt: {sm_url}\n")
                    try:
                        response = requests.get(sm_url, timeout=10)
                        if response.status_code == 200:
                            root = ET.fromstring(response.content)
                            ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
                            for url_elem in root.findall(".//sm:url/sm:loc", ns) or root.findall(".//url/loc"):
                                if url_elem.text:
                                    urls.append(url_elem.text)
                    except Exception:
                        pass
                    break

    sys.stderr.write(f"Found {len(urls)} URLs\n")

    # Step 2: Extract topics and classify pages
    topics = extract_topics_from_urls(urls)
    page_types = Counter()
    pages = []
    for url in urls:
        pt = classify_page_type(url)
        page_types[pt] += 1
        pages.append({"url": url, "page_type": pt, "rankings": []})

    # Step 3: Get top organic pages (pages-first approach - much less noisy than keywords_for_site)
    top_pages = []
    username, password = get_credentials()
    if username and password:
        sys.stderr.write("Fetching top organic pages...\n")
        client = DataForSEOClient(username, password)

        # Try relevant_pages (top pages by organic traffic)
        response = client.relevant_pages(domain, location, language, limit=100)
        error = extract_api_error(response)
        if not error:
            tasks = response.get("tasks", [])
            if tasks and tasks[0].get("result"):
                result = tasks[0]["result"][0]
                items = result.get("items") or []
                for item in items:
                    page_url = item.get("page_address", "")
                    metrics = item.get("metrics", {}) or {}
                    organic = metrics.get("organic", {}) or {}
                    if page_url:
                        top_pages.append({
                            "url": page_url,
                            "etv": organic.get("etv", 0),
                            "keyword_count": organic.get("count", 0),
                            "pos_1_10": (organic.get("pos_1", 0) + organic.get("pos_2_3", 0) +
                                        organic.get("pos_4_10", 0)),
                        })
            sys.stderr.write(f"Found {len(top_pages)} top organic pages\n")
        else:
            sys.stderr.write(f"  relevant_pages error: {error}\n")

        # Fallback: try with www. prefix
        if not top_pages:
            www_domain = f"www.{domain}"
            sys.stderr.write(f"  Trying with {www_domain}...\n")
            response = client.relevant_pages(www_domain, location, language, limit=100)
            error = extract_api_error(response)
            if not error:
                tasks = response.get("tasks", [])
                if tasks and tasks[0].get("result"):
                    result = tasks[0]["result"][0]
                    items = result.get("items") or []
                    for item in items:
                        page_url = item.get("page_address", "")
                        metrics = item.get("metrics", {}) or {}
                        organic = metrics.get("organic", {}) or {}
                        if page_url:
                            top_pages.append({
                                "url": page_url,
                                "etv": organic.get("etv", 0),
                                "keyword_count": organic.get("count", 0),
                                "pos_1_10": (organic.get("pos_1", 0) + organic.get("pos_2_3", 0) +
                                            organic.get("pos_4_10", 0)),
                            })
                sys.stderr.write(f"Found {len(top_pages)} top organic pages (www)\n")
    else:
        sys.stderr.write("No DataForSEO credentials, skipping organic data\n")

    # Calculate total ETV and top pages summary
    total_etv = sum(p.get("etv", 0) for p in top_pages)
    total_keywords = sum(p.get("keyword_count", 0) for p in top_pages)

    # Save full data
    output_file = Path(output_dir) / "existing_pages.json"
    with open(output_file, "w") as f:
        json.dump({
            "domain": domain,
            "site_url": site_url,
            "sitemap_pages": pages,
            "sitemap_topics": topics,
            "page_type_counts": dict(page_types),
            "top_organic_pages": top_pages,
            "total_etv": total_etv,
            "total_keywords": total_keywords,
        }, f, indent=2)

    # Generate summary
    summary = {
        "sitemap_pages": len(pages),
        "sitemap_topics": topics[:10],
        "page_types": dict(page_types),
        "organic_pages": len(top_pages),
        "total_etv": total_etv,
        "total_keywords": total_keywords,
        "top_pages_by_traffic": [
            {"url": p["url"], "etv": p["etv"], "keywords": p["keyword_count"]}
            for p in sorted(top_pages, key=lambda x: x.get("etv", 0), reverse=True)[:10]
        ],
    }

    print(json.dumps({"summary": summary, "output_files": {"existing_pages": str(output_file)}}, indent=2))


if __name__ == "__main__":
    main()
