# Topical Map Generator (DataForSEO)

Generate comprehensive topical maps and content strategies using DataForSEO Labs API + WebSearch competitor discovery. Builds page-level content plans with keyword data, search intent, and a 3-tier hierarchy (pillars → topics → pages).

## Installation

1. Download this zip file
2. In Claude Code, run:
   ```
   /install-skill topical-map-dfseo-v2.0.0.zip
   ```
3. Follow the prompts to configure your API keys

## Dependencies

### Python Packages
This skill requires (installed automatically):
```
requests>=2.28.0
```

### Python Version
Requires **Python 3.10+** (uses modern type hint syntax).

## API Keys & Costs

| Key | Service | How to Get | Pricing |
|-----|---------|------------|---------|
| `DATAFORSEO_USERNAME` | DataForSEO | [app.dataforseo.com/api-access](https://app.dataforseo.com/api-access) | Pay-as-you-go |
| `DATAFORSEO_PASSWORD` | DataForSEO | Same page (API password, not login) | $50 min deposit |

### Setup Steps
1. Register at [dataforseo.com](https://dataforseo.com)
2. Go to [app.dataforseo.com/api-access](https://app.dataforseo.com/api-access)
3. Your username = registration email
4. Your password = API password shown on that page (not your login password)
5. Add the credentials to a `.env` file in your project root:
   ```
   DATAFORSEO_USERNAME=your@email.com
   DATAFORSEO_PASSWORD=your_api_password
   ```

### Typical Costs Per Run
| Map Size | Competitors | Est. Cost |
|----------|-------------|-----------|
| Small | 5 | ~$4 |
| Medium | 10 | ~$6 |
| Large | 15 | ~$8 |

## Usage

Say any of:
- "Create a topical map for example.com"
- "Build a content strategy for my site"
- "Generate topic clusters for [niche]"

See `WORKFLOW.md` for detailed usage instructions and examples.

## What You Get

- **Keyword mapping CSV** — every keyword with volume, difficulty, CPC, intent
- **Page plan CSV** — recommended pages with primary/secondary keywords
- **Topical map diagram** — visual hierarchy of pillars → topics → pages
- **Full JSON data** — complete structured data for further processing

---
Packaged with Claude Code /export-skill
