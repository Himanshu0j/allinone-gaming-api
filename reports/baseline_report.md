# Baseline Architecture & Project Investigation Report

**Date & Time:** 2026-11-06 23:46 UTC  
**Repository:** `Himanshu0j/allinone-gaming-api`  
**Branch:** `feature/catalogue-verification-integration`  
**Target Domain:** `https://allinone-gaming-api.onrender.com/`  
**Reference Domain:** `https://igamingapis.com/` (Products Directory: `/products/`)  

---

## 1. Project Structure & Tech Stack Overview

- **Runtime & Framework:** Node.js (v22.x) with Express 5.3.0.
- **HTTP Client & Security:** Axios 1.21.0, Node native crypto (AES-256-ECB / PKCS7 padding), CORS.
- **Frontend Architecture:** 
  - Pure Vanilla Modern HTML5 / ES6 Modules / Tailwind CSS CDN / Font Awesome 6.4.0.
  - Core Modules:
    - `public/js/catalog.js`: Dynamic provider directory, category filters, in-brand catalog rendering, routing.
    - `public/js/launcher.js`: Popup-blocker-proof tab reservation, unified game launch bridge, status indicators.
    - `public/js/buy.js`: Plan selector, modular provider cart builder, TRC20/BEP20 USDT checkout.
    - `public/js/documentation.js`: API integration manual, dynamic language snippets (Node, PHP, Python, cURL), interactive AES-256 playground, webhook test.
    - `public/js/app.js`: Global state, agent verification modal, toast notifications, counters animation.
    - `public/demo-player.html`: Standalone interactive HTML5 slot engine & live session player with Web Audio API sound generator.
- **Data Persistence:**
  - Flat file JSON storage under `data/`:
    - `data/authentic_products_brands.json`: 169 provider records extracted from reference site.
    - `data/all_brand_games.json`: Provider-wise game catalogs and verified priority mapping.
    - `data/verified_game_urls.json`: Individual game launch URLs database (344 authentic verified endpoints).
    - `data/orders.json`: Registered operator licenses, credentials, and wallet credits.
    - `site_catalog.json`: Historical cached provider catalog and brand mappings.

---

## 2. Existing API Routes & Capabilities

| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/api/providers` | GET | Returns all providers with prices, categories, and cached game counts |
| `/api/brands/:brandId/games` | GET | Returns provider-specific game catalog |
| `/api/games/featured` | GET | Returns featured hot games list |
| `/api/launch-game` | ALL (GET/POST) | Authenticated & verified game launch router with geo-firewall |
| `/api/verify-agent` | POST | Validates agent access keys (`ALLINONE2026`, `VIP2026`, client IDs) |
| `/api/encrypt-payload` | POST | Live AES-256-ECB encryption tool for SoftAPI wire protocol |
| `/api/softapi/callback` | POST | Real-time webhook transaction callback receiver |
| `/api/checkout` | POST | Generates operator order with provisioned API key, secret, and credit |
| `/api/orders/:orderId` | GET | Order lookup for operators |
| `/api/admin/orders` | GET | Admin panel orders review |
| `/api/health` & `/api/ping` | GET | Health monitor & 24/7 Render keep-alive watchdog |

---

## 3. Session Handling & Geo-Firewall

- **Upstream Gateway:** `SoftApiGateway` in `server.js` manages cookiejar, agent authentication (`aca_agent_code`, `aca_launch_pass`), and nonce renewal with `igamingapis.com`.
- **Intelligent Geo-Firewall:** `isGeoBlockedDomain()` blocks known Indian IP blocking domains (`hvlhdbgi.biz`, `otgysixiin.net`, `hdonegame.com`, etc.) and seamlessly converts restricted streams into authorized interactive HTML5 slot engines or working live table sessions.
- **Zero Broken Links Guarantee:** Verified URL hit -> Name match -> Dynamic gateway launch -> Brand fallback -> Global verified table fallback.

---

## 4. Preservation & Safety Principles

1. All existing routes (`/api/providers`, `/api/launch-game`, `/api/verify-agent`, `/api/checkout`) must remain 100% backward-compatible.
2. Production configuration and live credentials must never be altered or hardcoded into frontend scripts.
3. No working backend logic or database records will be replaced with mock data.
4. All work is isolated in git branch `feature/catalogue-verification-integration`.
