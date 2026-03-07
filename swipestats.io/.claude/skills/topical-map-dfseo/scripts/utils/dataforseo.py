#!/usr/bin/env python3
"""
DataForSEO API client for topical-map-dfseo1.

Fresh client optimized for the new workflow:
- keyword_overview (replaces bulk_search_volume + bulk_keyword_difficulty + search_intent)
- domain_intersection (NEW — gap analysis)
- related_keywords (NEW — topic graph)
- categories_for_domain (NEW — topical authority)

Carries proven patterns from v4: auth, rate limiting, connection pooling, mega-site filter.
"""

import os
import sys
import time
import threading
import requests
from pathlib import Path
from typing import Optional, Dict, Any, List


def load_env() -> bool:
    """Load environment variables from .env file by walking up directory tree."""
    current = Path(__file__).resolve()
    for _ in range(10):
        current = current.parent
        env_path = current / ".env"
        if env_path.exists():
            try:
                with open(env_path) as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            key, value = line.split("=", 1)
                            os.environ.setdefault(key.strip(), value.strip().strip('"\''))
                return True
            except Exception:
                continue
    return False


def get_credentials() -> tuple[Optional[str], Optional[str]]:
    """Get DataForSEO credentials from environment."""
    load_env()
    username = os.environ.get("DATAFORSEO_USERNAME")
    password = os.environ.get("DATAFORSEO_PASSWORD")
    return username, password


class DataForSEOClient:
    """Client for DataForSEO APIs with rate limiting and connection pooling."""

    BASE_URL = "https://api.dataforseo.com/v3"

    MIN_REQUEST_INTERVAL = 0.03  # ~33 requests/second max

    MEGA_SITES = {
        "amazon.com", "amazon.co.uk", "amazon.de", "amazon.fr",
        "wikipedia.org", "youtube.com", "reddit.com", "quora.com",
        "facebook.com", "twitter.com", "linkedin.com", "instagram.com",
        "pinterest.com", "tiktok.com",
        "nytimes.com", "bbc.com", "cnn.com", "forbes.com",
        "yelp.com", "yellowpages.com", "tripadvisor.com",
        "medium.com", "wordpress.com", "blogger.com",
        "github.com", "stackoverflow.com",
        "apple.com", "google.com", "microsoft.com",
        "g2.com", "capterra.com", "trustpilot.com",
        "glassdoor.com", "indeed.com",
    }

    def __init__(self, username: str, password: str):
        self.auth = (username, password)
        self.last_request_time = 0
        self._rate_lock = threading.Lock()
        self.session = requests.Session()
        self.session.auth = self.auth
        self.session.headers.update({"Content-Type": "application/json"})
        adapter = requests.adapters.HTTPAdapter(pool_connections=25, pool_maxsize=25)
        self.session.mount("https://", adapter)

    def _rate_limit(self):
        """Enforce rate limiting between requests (thread-safe)."""
        with self._rate_lock:
            elapsed = time.time() - self.last_request_time
            if elapsed < self.MIN_REQUEST_INTERVAL:
                time.sleep(self.MIN_REQUEST_INTERVAL - elapsed)
            self.last_request_time = time.time()

    def _request(self, endpoint: str, payload: List[Dict], timeout: int = 120) -> Dict[str, Any]:
        """Make API request with error handling."""
        self._rate_limit()
        url = f"{self.BASE_URL}/{endpoint}"
        try:
            response = self.session.post(url, json=payload, timeout=timeout)
            response.raise_for_status()
            return response.json()
        except requests.Timeout:
            return {"error": f"Request timeout after {timeout}s", "status_code": "TIMEOUT"}
        except requests.RequestException as e:
            return {"error": str(e), "status_code": getattr(e.response, 'status_code', 'UNKNOWN')}

    # ===================
    # KEYWORD ENDPOINTS
    # ===================

    def keyword_overview(
        self,
        keywords: List[str],
        location: str = "United States",
        language: str = "English"
    ) -> Dict[str, Any]:
        """
        Comprehensive keyword data in ONE call. Up to 700 keywords/batch.
        Returns: volume, CPC, difficulty, intent, SERP features, core_keyword,
        monthly trends, categories.
        Replaces: bulk_search_volume + bulk_keyword_difficulty + search_intent
        Cost: ~$0.11 per 700 keywords
        """
        payload = [{
            "keywords": keywords[:700],
            "location_name": location,
            "language_name": language
        }]
        return self._request("dataforseo_labs/google/keyword_overview/live", payload)

    def keyword_ideas(
        self,
        keywords: List[str],
        location: str = "United States",
        language: str = "English",
        limit: int = 500
    ) -> Dict[str, Any]:
        """Keyword ideas from category matching (up to 200 seeds). Cost: ~$0.11"""
        payload = [{
            "keywords": keywords[:200],
            "location_name": location,
            "language_name": language,
            "limit": limit,
            "closely_variants": False,
            "include_serp_info": False
        }]
        return self._request("dataforseo_labs/google/keyword_ideas/live", payload)

    def related_keywords(
        self,
        keyword: str,
        location: str = "United States",
        language: str = "English",
        depth: int = 2,
        limit: int = 300
    ) -> Dict[str, Any]:
        """
        Google's 'related searches' graph. depth=3 max (~4680 keywords).
        Cost: ~$0.11 per call
        """
        payload = [{
            "keyword": keyword,
            "location_name": location,
            "language_name": language,
            "depth": depth,
            "limit": limit,
            "include_seed_keyword": True
        }]
        return self._request("dataforseo_labs/google/related_keywords/live", payload)

    def keyword_suggestions(
        self,
        keyword: str,
        location: str = "United States",
        language: str = "English",
        limit: int = 500
    ) -> Dict[str, Any]:
        """
        Long-tail variations containing the seed phrase.
        Good for expanding seed queries to catch niche terms.
        Cost: ~$0.11 per call
        """
        payload = [{
            "keyword": keyword,
            "location_name": location,
            "language_name": language,
            "limit": min(limit, 1000),
            "include_seed_keyword": True,
            "include_serp_info": False
        }]
        return self._request("dataforseo_labs/google/keyword_suggestions/live", payload)

    def keywords_for_site(
        self,
        domain: str,
        location: str = "United States",
        language: str = "English",
        limit: int = 500
    ) -> Dict[str, Any]:
        """Keywords a domain currently ranks for. Cost: ~$0.11"""
        payload = [{
            "target": domain,
            "location_name": location,
            "language_name": language,
            "limit": limit,
            "include_serp_info": True,
            "order_by": ["keyword_info.search_volume,desc"]
        }]
        return self._request("dataforseo_labs/google/keywords_for_site/live", payload)

    # ===================
    # DOMAIN ENDPOINTS
    # ===================

    def competitors_domain(
        self,
        domain: str,
        location: str = "United States",
        language: str = "English",
        limit: int = 30
    ) -> Dict[str, Any]:
        """Find competing domains ranked by keyword overlap. Cost: ~$0.11"""
        payload = [{
            "target": domain,
            "location_name": location,
            "language_name": language,
            "limit": limit,
            "exclude_top_domains": True,
            "order_by": ["intersections,desc"]
        }]
        return self._request("dataforseo_labs/google/competitors_domain/live", payload)

    def categories_for_domain(
        self,
        domain: str,
        location: str = "United States",
        language: str = "English"
    ) -> Dict[str, Any]:
        """Topical categories a domain covers (Google taxonomy). Cost: ~$0.11"""
        payload = [{
            "target": domain,
            "location_name": location,
            "language_name": language
        }]
        return self._request("dataforseo_labs/google/categories_for_domain/live", payload)

    def ranked_keywords(
        self,
        domain: str,
        location: str = "United States",
        language: str = "English",
        limit: int = 500,
        filters: Optional[List] = None
    ) -> Dict[str, Any]:
        """Keywords a domain ranks for (with optional filters). Cost: ~$0.11"""
        payload = [{
            "target": domain,
            "location_name": location,
            "language_name": language,
            "limit": limit,
            "include_serp_info": False,
            "order_by": ["keyword_data.keyword_info.search_volume,desc"]
        }]
        if filters:
            payload[0]["filters"] = filters
        return self._request("dataforseo_labs/google/ranked_keywords/live", payload)

    def domain_intersection(
        self,
        target_domain: str,
        competitor_domain: str,
        location: str = "United States",
        language: str = "English",
        limit: int = 1000,
        gap_mode: bool = True
    ) -> Dict[str, Any]:
        """
        Keyword gap analysis between two domains.
        target1 = competitor (the domain that HAS keywords we want to find).
        target2 = our domain (the one we're checking gaps FOR).
        gap_mode=True → intersections="false" → returns keywords target1 ranks for but target2 doesn't.
        Cost: ~$0.11 per call
        """
        payload = [{
            "target1": competitor_domain,   # Competitor FIRST (has keywords)
            "target2": target_domain,       # Your domain SECOND (doesn't)
            "location_name": location,
            "language_name": language,
            "limit": limit,
            "order_by": ["keyword_data.keyword_info.search_volume,desc"]
        }]
        if gap_mode:
            payload[0]["intersections"] = "false"  # String, not dict
        return self._request("dataforseo_labs/google/domain_intersection/live", payload)

    def relevant_pages(
        self,
        domain: str,
        location: str = "United States",
        language: str = "English",
        limit: int = 200
    ) -> Dict[str, Any]:
        """Top pages by estimated traffic. Cost: ~$0.11"""
        payload = [{
            "target": domain,
            "location_name": location,
            "language_name": language,
            "limit": limit,
            "order_by": ["metrics.organic.etv,desc"]
        }]
        return self._request("dataforseo_labs/google/relevant_pages/live", payload)

    def serp_organic(
        self,
        keyword: str,
        location: str = "United States",
        language: str = "English",
        depth: int = 10
    ) -> Dict[str, Any]:
        """
        Live SERP results. Used in Path B (new site) for seed query discovery.
        Cost: ~$0.005 per call
        """
        payload = [{
            "keyword": keyword,
            "location_name": location,
            "language_name": language,
            "depth": depth,
            "calculate_rectangles": False
        }]
        return self._request("serp/google/organic/live/advanced", payload)

    # ===================
    # BACKLINKS ENDPOINTS
    # ===================

    def bulk_ranks(
        self,
        domains: List[str],
    ) -> Dict[str, Any]:
        """
        Get Domain Rank for up to 1,000 domains in one call.
        Returns DataForSEO's Domain Rank (0-1000, logarithmic scale based on PageRank).
        Cost: ~$0.02 per call (regardless of domain count)
        """
        # API expects targets as list of domains
        payload = [{
            "targets": domains[:1000]
        }]
        return self._request("backlinks/bulk_ranks/live", payload)

    # ===================
    # HELPERS
    # ===================

    def is_mega_site(self, domain: str) -> bool:
        """Check if domain is a mega-site that should be excluded."""
        domain_clean = domain.lower().replace("www.", "")
        return domain_clean in self.MEGA_SITES

    def extract_domain(self, url: str) -> str:
        """Extract domain from URL."""
        from urllib.parse import urlparse
        try:
            parsed = urlparse(url if url.startswith("http") else f"https://{url}")
            domain = parsed.netloc or parsed.path.split("/")[0]
            return domain.lower().replace("www.", "")
        except Exception:
            return url.lower().replace("www.", "")


# ===================
# RESPONSE EXTRACTORS
# ===================

def extract_api_error(response: Dict) -> Optional[str]:
    """Extract error message from API response."""
    if "error" in response:
        return response["error"]
    tasks = response.get("tasks", [])
    if tasks and tasks[0].get("status_code") != 20000:
        return tasks[0].get("status_message", "Unknown API error")
    return None


def _get_items(response: Dict) -> List[Dict]:
    """Get items from a standard DataForSEO response."""
    tasks = response.get("tasks", [])
    if not tasks:
        return []
    result = tasks[0].get("result", [])
    if not result or not result[0]:
        return []
    return result[0].get("items") or []


def extract_keywords_from_response(response: Dict) -> List[Dict]:
    """Extract keyword data from keywords_for_site or ranked_keywords response."""
    keywords = []
    for item in _get_items(response):
        kw_data = item.get("keyword_data", {})
        kw_info = kw_data.get("keyword_info", {}) if kw_data else item.get("keyword_info", {})
        keyword_str = kw_data.get("keyword", "") if kw_data else item.get("keyword", "")

        position = None
        ranked_elem = item.get("ranked_serp_element")
        if ranked_elem:
            serp_item = ranked_elem.get("serp_item", {})
            position = serp_item.get("rank_absolute")

        # Get URL from ranked element
        url = None
        if ranked_elem:
            serp_item = ranked_elem.get("serp_item", {})
            url = serp_item.get("url")

        keywords.append({
            "keyword": keyword_str,
            "search_volume": kw_info.get("search_volume") or 0,
            "cpc": kw_info.get("cpc") or 0,
            "competition": kw_info.get("competition") or 0,
            "position": position,
            "url": url,
        })
    return keywords


def extract_keyword_overview_data(response: Dict) -> List[Dict]:
    """
    Extract enriched keyword data from keyword_overview response.
    Returns all fields that replace 3 separate v4 calls.
    """
    keywords = []
    for item in _get_items(response):
        kw_info = item.get("keyword_info", {}) or {}
        kw_props = item.get("keyword_properties", {}) or {}
        serp_info = item.get("serp_info", {}) or {}
        intent_info = item.get("search_intent_info", {}) or {}

        monthly = kw_info.get("monthly_searches") or []
        trend = "stable"
        if len(monthly) >= 6:
            recent_3 = sum((m.get("search_volume") or 0) for m in monthly[:3])
            older_3 = sum((m.get("search_volume") or 0) for m in monthly[3:6])
            if older_3 > 0:
                change = (recent_3 - older_3) / older_3
                if change > 0.2:
                    trend = "rising"
                elif change < -0.2:
                    trend = "declining"

        keywords.append({
            "keyword": item.get("keyword", ""),
            "search_volume": kw_info.get("search_volume") or 0,
            "cpc": kw_info.get("cpc") or 0,
            "competition": kw_info.get("competition") or 0,
            "competition_level": kw_info.get("competition_level") or "",
            "difficulty": kw_props.get("keyword_difficulty") or 0,
            "core_keyword": kw_props.get("core_keyword", ""),
            "intent": intent_info.get("main_intent", "unknown"),
            "serp_features": serp_info.get("serp_item_types") or [],
            "categories": kw_info.get("categories") or [],
            "monthly_searches": monthly,
            "trend": trend,
        })
    return keywords


def extract_competitors_data(response: Dict) -> List[Dict]:
    """Extract competitor data from competitors_domain response."""
    competitors = []
    for item in _get_items(response):
        metrics = {"intersections": 0, "etv": 0, "keywords_count": 0}
        fdm = item.get("full_domain_metrics")
        if fdm:
            src = fdm[0] if isinstance(fdm, list) and len(fdm) > 0 else fdm if isinstance(fdm, dict) else {}
            organic = src.get("organic", {}) or {}
            metrics = {
                "intersections": organic.get("intersections", 0),
                "etv": organic.get("etv", 0),
                "keywords_count": organic.get("count", 0),
            }
        competitors.append({
            "domain": item.get("domain", ""),
            "avg_position": item.get("avg_position", 0),
            **metrics,
        })
    return competitors


def extract_domain_intersection_keywords(response: Dict) -> List[Dict]:
    """Extract keywords from domain_intersection (gap analysis) response."""
    keywords = []
    for item in _get_items(response):
        kw_data = item.get("keyword_data", {}) or {}
        kw_info = kw_data.get("keyword_info", {}) or {}
        keywords.append({
            "keyword": kw_data.get("keyword", ""),
            "search_volume": kw_info.get("search_volume") or 0,
            "cpc": kw_info.get("cpc") or 0,
            "competition": kw_info.get("competition") or 0,
            "is_gap": True,
        })
    return keywords


def extract_categories_data(response: Dict) -> List[Dict]:
    """Extract category data from categories_for_domain response."""
    categories = []
    for item in _get_items(response):
        categories.append({
            "category_id": item.get("category"),
            "category_name": item.get("category_name", ""),
            "keywords_count": item.get("keywords_count", 0),
            "etv": item.get("etv", 0),
        })
    return categories


def extract_serp_domains(response: Dict, max_results: int = 10) -> List[str]:
    """Extract domains from SERP organic results."""
    domains = []
    for item in _get_items(response):
        if item.get("type") == "organic":
            url = item.get("url", "")
            if url:
                from urllib.parse import urlparse
                try:
                    parsed = urlparse(url)
                    domain = parsed.netloc.lower().replace("www.", "")
                    if domain and domain not in domains:
                        domains.append(domain)
                        if len(domains) >= max_results:
                            break
                except Exception:
                    continue
    return domains


def extract_related_keywords(response: Dict) -> List[Dict]:
    """Extract keywords from related_keywords response."""
    keywords = []
    for item in _get_items(response):
        kw_data = item.get("keyword_data", {}) or {}
        kw_info = kw_data.get("keyword_info", {}) or {}
        keywords.append({
            "keyword": kw_data.get("keyword", ""),
            "search_volume": kw_info.get("search_volume") or 0,
            "cpc": kw_info.get("cpc") or 0,
            "competition": kw_info.get("competition") or 0,
        })
    return keywords


def extract_keyword_suggestions(response: Dict) -> List[Dict]:
    """Extract keywords from keyword_suggestions response."""
    keywords = []
    for item in _get_items(response):
        kw_data = item.get("keyword_data", {}) or {}
        kw_info = kw_data.get("keyword_info", {}) or {}
        keywords.append({
            "keyword": kw_data.get("keyword", ""),
            "search_volume": kw_info.get("search_volume") or 0,
            "cpc": kw_info.get("cpc") or 0,
            "competition": kw_info.get("competition") or 0,
        })
    return keywords


def extract_bulk_ranks(response: Dict) -> Dict[str, int]:
    """
    Extract domain ranks from bulk_ranks response.
    Returns dict of domain -> rank (0-1000 scale).
    """
    ranks = {}
    for item in _get_items(response):
        target = item.get("target", "")
        rank = item.get("rank", 0)
        if target:
            ranks[target.lower().replace("www.", "")] = rank or 0
    return ranks
