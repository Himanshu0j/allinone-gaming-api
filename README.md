# AllInOne API – Unified Casino & Sportsbook API Platform

Ultra-premium, enterprise-grade B2B iGaming API aggregation platform connecting online operators to **139+ certified game providers** and **15,000+ games** through a single high-speed encrypted Unified Wallet API.

---

## 🚀 Key Features

1. **139+ Certified Providers Matrix**:
   - Includes: Pragmatic Play, Evolution Live, JDB, Spribe (Aviator), PG Soft, Microgaming, NetEnt, CQ9, BetSoft, JILI, FaChai, Endorphina, Ezugi, Habanero, BTI Sports, SABA Sports, etc.
   - Filterable across 8 categories: **All, HOT, Slots, Live Casino, Sportsbook, Crash/Mini Games, Card Games, Matka, Marbles**.
   - Instant live search & category filtering.
   - Brand Drawer: Full catalog of games with direct demo launch.

2. **Cinematic Game Player HUD**:
   - Real-time launch gateway handshake.
   - Live upstream direct game launch with interactive fallback simulation.
   - Fullscreen mode, sound toggles, and responsive mobile/desktop layout.

3. **AllInOne API Developer Suite**:
   - **Catalog APIs**: `GET /api/providers`, `GET /api/provider/:id/games`.
   - **Launch Game API**: `POST /api/launch-game` with AES encryption.
   - **Interactive Code Switcher**: Ready snippets for Node.js, PHP, Python, and cURL.
   - **Live Encryption Playground**: Test Base64 ciphertext generation.

4. **Monetization & Plans**:
   - **3-Day Sandbox Trial**: $50 USDT (includes $12 USDT test credit).
   - **10-Year All Providers**: $800 USDT (includes $100 USDT credit).
   - **VIP Unlimited 10-Year**: $1,500 USDT (includes $900 USDT credit).
   - **Modular Custom Brands**: $45 USDT – $120 USDT / provider.
   - Instant automated receipt with Operator ID (`AGT-XXXXXX`), AES API Key, and Secret.

5. **VIP Support & Agent Access**:
   - Phone / WhatsApp Support: **+91 80523 54357**
   - Agent Security Code: `hdsoftapi1` or auto-generated `AGT-XXXXXX` from checkout.

---

## 🛠️ Tech Stack & Setup

- **Backend**: Node.js + Express + Axios + Native Crypto.
- **Frontend**: Tailwind CSS + Font Awesome + Vanilla ES6 JS.
- **Theme**: Obsidian dark luxury (`#07080b`), Gold accents (`#f59e0b`), Glassmorphism.

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start the platform server
npm start
```
Server runs at `http://localhost:3000`.

---

## 🌐 Cloud Deployment

### 1. Render (Recommended)
1. Push this repository to GitHub.
2. Go to [Render.com](https://render.com) and click **New + > Web Service**.
3. Select your repository `allinone-gaming-api`.
4. Runtime: `Node`, Build Command: `npm install`, Start Command: `node server.js`.
5. Click **Create Web Service**!

### 2. Vercel
1. Import the repository in [Vercel](https://vercel.com).
2. The included `vercel.json` and `api/index.js` automatically route API endpoints and static assets.
3. Click **Deploy**!
