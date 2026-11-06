const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// -----------------------------------------------------------------------------
// Live SoftAPI Gateway Session Manager
// -----------------------------------------------------------------------------
class SoftApiGateway {
  constructor() {
    this.agentCode = 'hdsoftapi1';
    this.session = axios.create({
      baseURL: 'https://igamingapis.com',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });
    this.launchPass = null;
    this.launchPassExpiry = 0;
    this.brandNonces = {};
    this.brandGamesCache = {};
    this.brandSlugMap = {};
    this.cookies = {};
  }

  extractCookies(response) {
    if (!this.cookies) this.cookies = {};
    const setCookie = response && response.headers ? response.headers['set-cookie'] : null;
    if (setCookie && Array.isArray(setCookie)) {
      setCookie.forEach(c => {
        const parts = c.split(';')[0].split('=');
        if (parts.length >= 2) {
          this.cookies[parts[0].trim()] = parts.slice(1).join('=').trim();
        }
      });
    }
  }

  getCookieString() {
    if (!this.cookies) this.cookies = {};
    this.cookies['aca_agent_code'] = this.agentCode;
    if (this.launchPass) this.cookies['aca_launch_pass'] = this.launchPass;
    return Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join('; ');
  }

  async ensureAuthenticated() {
    const now = Date.now();
    if (this.launchPass && this.launchPassExpiry > now) {
      return this.launchPass;
    }

    try {
      console.log('[GATEWAY] Authenticating with agent code hdsoftapi1...');
      const docRes = await this.session.get('/documentation/');
      this.extractCookies(docRes);

      const nonceMatch = docRes.data.match(/var nonce = "([^"]+)"/);
      const postMatch = docRes.data.match(/var postId = ([0-9]+)/);

      if (!nonceMatch || !postMatch) {
        throw new Error('Failed to extract nonce or postId from documentation page');
      }

      const valRes = await this.session.post('/wp-admin/admin-ajax.php', 
        new URLSearchParams({
          action: 'aca_validate_agent_code',
          code: this.agentCode,
          post_id: postMatch[1],
          context: 'buy',
          nonce: nonceMatch[1]
        }).toString(), {
          headers: { 
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': this.getCookieString()
          }
        }
      );
      this.extractCookies(valRes);

      if (valRes.data && valRes.data.success && valRes.data.data && valRes.data.data.launch_pass) {
        this.launchPass = valRes.data.data.launch_pass;
        this.launchPassExpiry = now + 20 * 60 * 1000;
        console.log('[GATEWAY] Session verified. Launch pass active:', this.launchPass);
        return this.launchPass;
      }
      throw new Error('Validation rejected: ' + JSON.stringify(valRes.data));
    } catch (err) {
      console.error('[GATEWAY AUTH ERROR]', err.message);
      return this.launchPass || 'FALLBACK_LAUNCH_PASS';
    }
  }

  async getBrandPageGames(brandSlug) {
    const slug = (brandSlug || '').trim().toLowerCase();
    if (!slug) return [];

    if (this.brandGamesCache[slug] && this.brandGamesCache[slug].length > 0) {
      return this.brandGamesCache[slug];
    }

    try {
      await this.ensureAuthenticated();
      const res = await this.session.get(`/brand/${slug}/`, {
        headers: { 'Cookie': this.getCookieString() }
      });
      this.extractCookies(res);
      const html = res.data;

      const bnMatch = html.match(/var igamingBrandLaunch = \{.*?"nonce":"([^"]+)"/);
      if (bnMatch) {
        this.brandNonces[slug] = bnMatch[1];
      }

      const games = [];
      const cardRegex = /<a[^>]+class="[^"]*brand-product-card[^"]*"[^>]*data-product-id="(\d+)"[^>]*>([\s\S]*?)<\/a>/g;
      let match;

      while ((match = cardRegex.exec(html)) !== null) {
        const pid = match[1];
        const cardInner = match[2];

        let title = '';
        const titleMatch = cardInner.match(/<div class="brand-product-title">([^<]+)<\/div>/);
        if (titleMatch) {
          title = titleMatch[1].trim();
        }

        let img = '';
        const imgMatch = cardInner.match(/<img[^>]+src="([^">]+)"/);
        if (imgMatch) {
          img = imgMatch[1].trim();
        }

        let gameCode = pid;
        const codeMatch = img.match(/\/(\d+)(?:-\d+x\d+)?\.(?:png|jpg|webp)/);
        if (codeMatch) {
          gameCode = codeMatch[1];
        }

        games.push({
          product_id: pid,
          game_code: gameCode,
          game_name: title || `Game #${pid}`,
          game_img: img,
          brand_slug: slug
        });
      }

      if (games.length > 0) {
        this.brandGamesCache[slug] = games;
        console.log(`[GATEWAY] Scraped ${games.length} games for brand ${slug}`);
        return games;
      }
    } catch (e) {
      console.warn(`[GATEWAY] Error scraping brand ${slug}:`, e.message);
    }

    return this.brandGamesCache[slug] || [];
  }

  async launchGame(productId, brandSlug = '') {
    await this.ensureAuthenticated();
    let slug = (brandSlug || '100hp').trim().toLowerCase();
    
    // Normalization
    if (slug === 'aviator') {
      slug = 'spribe';
      if (!productId || productId === 'default') productId = '6868';
    }

    const verifiedBrandPids = {
      'spribe': '6868',
      '100hp': '9810',
      'bgaming': '8262',
      'ag': '21487',
      '18peaches': '22554',
      '2j': '16701',
      '5ggaming': '16579',
      '9game': '22575',
      '9wickets': '20110',
      'amigo': '19742',
      'aog': '17694',
      'askmeslot': '18052',
      'astar': '14158',
      'atm': '19748',
      'aura-gaming': '23085',
      'aviatrix': '19754',
      'evolution-live': '6312',
      'pragmaticplay-asia': '10020',
      'jdb': '12100'
    };

    let targetPid = productId && productId !== 'default' ? String(productId) : (verifiedBrandPids[slug] || '9810');

    // Helper: execute single launch call on igamingapis.com
    const executeLaunch = async (pid, sSlug) => {
      let nonce = this.brandNonces[sSlug];
      if (!nonce) {
        try {
          const r = await this.session.get(`/brand/${sSlug}/`, {
            headers: { 'Cookie': this.getCookieString() }
          });
          this.extractCookies(r);
          const bnMatch = r.data.match(/var igamingBrandLaunch = \{.*?"nonce":"([^"]+)"/);
          if (bnMatch) {
            nonce = bnMatch[1];
            this.brandNonces[sSlug] = nonce;
          }
        } catch (e) {}
      }

      if (!nonce) nonce = '8412000fc2';

      const launchRes = await this.session.post('/wp-admin/admin-ajax.php',
        new URLSearchParams({
          action: 'igaming_launch_game',
          product_id: String(pid),
          nonce: nonce,
          launch_pass: this.launchPass
        }).toString(), {
          headers: { 
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': this.getCookieString()
          }
        }
      );
      this.extractCookies(launchRes);
      return launchRes.data;
    };

    try {
      // 1. First attempt with requested PID
      console.log(`[GATEWAY ATTEMPT] Launching PID ${targetPid} for brand ${slug}...`);
      let launchData = await executeLaunch(targetPid, slug);

      if (launchData && launchData.success && launchData.data && launchData.data.url) {
        console.log(`[GATEWAY SUCCESS] PID ${targetPid} (${slug}) -> Live URL resolved`);
        return {
          success: true,
          type: 'live',
          url: launchData.data.url,
          game_uid: launchData.data.game_uid || targetPid,
          open_in_tab: !!launchData.data.open_in_tab
        };
      }

      // 2. If targetPid is under maintenance, try verified PID for this brand
      if (verifiedBrandPids[slug] && verifiedBrandPids[slug] !== targetPid) {
        const vPid = verifiedBrandPids[slug];
        console.log(`[GATEWAY RETRY] Target PID ${targetPid} under maintenance. Trying verified PID ${vPid} for ${slug}...`);
        launchData = await executeLaunch(vPid, slug);
        if (launchData && launchData.success && launchData.data && launchData.data.url) {
          console.log(`[GATEWAY SUCCESS] Verified PID ${vPid} (${slug}) -> Live URL resolved`);
          return {
            success: true,
            type: 'live',
            url: launchData.data.url,
            game_uid: launchData.data.game_uid || vPid,
            open_in_tab: !!launchData.data.open_in_tab
          };
        }
      }

      // 3. Scan up to 3 cached games of this brand for an active live session
      const cached = this.brandGamesCache[slug] || [];
      for (const g of cached.slice(0, 5)) {
        if (g.product_id && g.product_id !== targetPid) {
          try {
            console.log(`[GATEWAY SCAN] Trying alternate game ${g.game_name} (PID: ${g.product_id}) for ${slug}...`);
            const altData = await executeLaunch(g.product_id, slug);
            if (altData && altData.success && altData.data && altData.data.url) {
              console.log(`[GATEWAY SCAN SUCCESS] Found active live title: ${g.game_name} (${g.product_id})`);
              return {
                success: true,
                type: 'live',
                url: altData.data.url,
                game_uid: altData.data.game_uid || g.product_id,
                open_in_tab: !!altData.data.open_in_tab
              };
            }
          } catch (errAlt) {}
        }
      }

      return {
        success: false,
        message: (launchData && launchData.data) ? String(launchData.data) : 'Under maintenance',
        data: launchData
      };
    } catch (err) {
      console.error('[GATEWAY LAUNCH ERROR]', err.message);
      return { success: false, message: err.message };
    }
  }
}

const gateway = new SoftApiGateway();
gateway.ensureAuthenticated().catch(() => {});

// Load pre-cached catalog
let catalogData = { providers: [], catalog: {} };
const catalogPath = path.join(__dirname, 'site_catalog.json');
if (fs.existsSync(catalogPath)) {
  try {
    catalogData = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    console.log(`[INIT] Loaded ${catalogData.providers.length} providers from site_catalog.json`);
    
    // Build brand slug mapping
    catalogData.providers.forEach(p => {
      const slug = (p.brand_title || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      gateway.brandSlugMap[p.brand_id] = slug;
    });
  } catch (err) {
    console.error('[INIT] Error reading site_catalog.json:', err.message);
  }
}

// Orders Persistent Storage Helper
let inMemoryOrders = [];
const ORDERS_FILE = path.join(__dirname, 'data', 'orders.json');
function getOrders() {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const data = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
      if (Array.isArray(data) && data.length > 0) return data;
    }
    return inMemoryOrders;
  } catch (e) {
    return inMemoryOrders;
  }
}

function saveOrder(order) {
  inMemoryOrders.unshift(order);
  try {
    if (!fs.existsSync(path.dirname(ORDERS_FILE))) {
      fs.mkdirSync(path.dirname(ORDERS_FILE), { recursive: true });
    }
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(inMemoryOrders, null, 2));
  } catch (e) {
    console.warn('[ORDER STORAGE] Persistent write failed, cached in memory:', e.message);
  }
  return order;
}

// Brand prices lookup table (with marked-up commercial margins)
const brandPrices = {
  'koolbet': 120, 'mt gaming': 45, 'v8 card': 50,
  'aog': 45, 'astar': 120, 'aura gaming': 45, 'casino': 45, 'casino game (cg)': 45,
  'creedroomz': 45, 'dreamgaming': 120, 'eeai': 45, 'evolution live': 45,
  'evolution live (asia)': 45, 'evolution-btg row': 45, 'evolution-nlc row': 45,
  'gamingsoft-ai live casino': 45, 'ideal': 120, 'microgaming': 120, 'ongaming': 45,
  'playtech': 120, 'pragmaticplaylive-asia': 45, 'pragmaticplaylive-eu': 45,
  'sagaming': 120, 'sexy': 120, 'wintolive': 45, 'wm casino': 50, 'yeebet': 45,
  'atm': 45, 'atg': 45, 'aviator': 45, 'aviatrix': 45, 'veliplay': 45, 'bharat matka': 45,
  '100hp': 45, '18peaches': 45, '2j': 120, '3oaks (bng)': 120, '5ggaming': 120,
  '759 gaming': 45, '9game': 45, 'ag': 45, 'amigo': 45, 'askmeslot': 45,
  'betsoft': 45, 'bg': 45, 'bgaming': 45, 'biggaming': 45, 'bigtimegaming': 45,
  'bigtimegaming(asia)': 45, 'btgaming': 120, 'cp': 45, 'cq9': 45, 'darpha': 45,
  'db': 45, 'eazygaming': 50, 'endorphina': 45, 'epicwin': 120, 'evo888h5': 45,
  'evoplay': 120, 'expanse': 45, 'ezugi': 120, 'fachai gaming': 45, 'fast spin': 45,
  'funky games': 45, 'galaxsys': 120, 'gameart': 45, 'gamingsoft-wow': 45,
  'habanero': 120, 'hacksaw asia': 120, 'hacksaw latam': 120, 'hacksaw world': 120,
  'inout': 35, 'jdb': 45, 'jili': 45, 'king midas': 45, 'ky gaming': 45,
  'live22': 45, 'netent': 45, 'netent（asia）': 45, 'nextspin': 120, 'nolimit city': 45,
  'nolimit city（asia）': 45, 'pgsoft': 45, 'pgsgaming': 45, 'playngo': 120,
  'playson': 120, 'pragmaticplay-asia': 45, 'pragmaticplay-eu': 45, 'redtiger': 120,
  'relaxgaming': 120, 'rich88': 120, 'skywind': 120, 'smartsoft': 120, 'spribe': 45,
  'tadagaming': 45, 'turbogames world': 120, 'vivo': 45,
  '9wickets': 45, 'cmd': 45, 'betby': 120, 'btigaming': 50, 'dpesports': 120,
  'dpsports': 120, 'luckysport': 120, 'sabasports(ibc)': 45, 'sbo': 45,
  'tf': 120, 'topbet': 45, 'unitedgaming': 45, 'ws168': 45
};

// Helper: PKCS7 padding for AES-256-ECB
function pkcs7Pad(buf, block = 16) {
  const pad = block - (buf.length % block);
  return Buffer.concat([buf, Buffer.alloc(pad, pad)]);
}

function pkcs7Unpad(buf) {
  if (buf.length === 0) return buf;
  const pad = buf[buf.length - 1];
  if (pad < 1 || pad > 16) return buf;
  return buf.subarray(0, buf.length - pad);
}

function aes256EcbEncrypt(plaintext, key32) {
  const keyBuf = Buffer.alloc(32);
  Buffer.from(key32).copy(keyBuf);
  const cipher = crypto.createCipheriv('aes-256-ecb', keyBuf, null);
  cipher.setAutoPadding(false);
  const padded = pkcs7Pad(Buffer.from(plaintext, 'utf8'));
  return Buffer.concat([cipher.update(padded), cipher.final()]).toString('base64');
}

function aes256EcbDecrypt(base64Str, key32) {
  const keyBuf = Buffer.alloc(32);
  Buffer.from(key32).copy(keyBuf);
  const decipher = crypto.createDecipheriv('aes-256-ecb', keyBuf, null);
  decipher.setAutoPadding(false);
  const raw = Buffer.from(base64Str, 'base64');
  const decrypted = Buffer.concat([decipher.update(raw), decipher.final()]);
  return pkcs7Unpad(decrypted).toString('utf8');
}

// -----------------------------------------------------------------------------
// API Endpoints
// -----------------------------------------------------------------------------

// 1. Get full providers list with pricing & metadata
app.get('/api/providers', (req, res) => {
  const providers = (catalogData.providers || []).map(p => {
    const key = (p.brand_title || '').trim().toLowerCase();
    const price = brandPrices[key] || 18;
    const slug = (p.brand_title || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return {
      ...p,
      brand_slug: slug,
      price_usdt: price,
      cached_games_count: (catalogData.catalog && catalogData.catalog[p.brand_id]) ? catalogData.catalog[p.brand_id].length : 0
    };
  });
  res.json({ status: true, total: providers.length, providers });
});

// 2. Get games for a specific brand (with real product_ids for live launch)
app.get('/api/brands/:brandId/games', async (req, res) => {
  const brandParam = String(req.params.brandId).trim();
  
  // Find brand slug
  let slug = brandParam.toLowerCase();
  const provider = (catalogData.providers || []).find(p => p.brand_id === brandParam || p.brand_title.toLowerCase() === slug);
  if (provider) {
    slug = provider.brand_title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    // Common brand slug normalizations
    if (slug === 'evolution-live') slug = 'evolution-live';
    else if (slug === '3oaks-bng') slug = '3oaks-bng';
    else if (slug === 'bharat-matka') slug = 'bharat-matka';
    else if (slug === 'pragmaticplay') slug = 'pragmaticplay-asia';
  }

  // 1. First, check live scraped brand games (which contain real product_ids)
  const brandGames = await gateway.getBrandPageGames(slug);
  if (brandGames && brandGames.length > 0) {
    return res.json({
      status: true,
      brand_id: brandParam,
      brand_slug: slug,
      total_games: brandGames.length,
      games: brandGames,
      source: 'live_gateway'
    });
  }

  // 2. Fallback to catalogData.catalog
  if (catalogData.catalog && catalogData.catalog[brandParam] && catalogData.catalog[brandParam].length > 0) {
    const fallbackList = catalogData.catalog[brandParam].map(g => ({
      ...g,
      product_id: g.product_id || g.game_code || '9810',
      brand_slug: slug
    }));
    return res.json({
      status: true,
      brand_id: brandParam,
      brand_slug: slug,
      total_games: fallbackList.length,
      games: fallbackList,
      source: 'cached_catalog'
    });
  }

  return res.json({
    status: true,
    brand_id: brandParam,
    brand_slug: slug,
    total_games: 0,
    games: [],
    source: 'empty'
  });
});

// 3. Featured Games across all providers with verified live Product IDs
app.get('/api/games/featured', (req, res) => {
  const verifiedFeatured = [
    {
      product_id: '6868',
      game_code: '737',
      game_name: 'Aviator (Spribe)',
      category: 'Crash',
      game_img: 'https://igamingapis.com/wp-content/uploads/2026/04/737-222x300.png',
      brand_slug: 'spribe',
      brand_title: 'Spribe'
    },
    {
      product_id: '9810',
      game_code: '8771',
      game_name: 'Air Jet Crash',
      category: 'Crash',
      game_img: 'https://igamingapis.com/wp-content/uploads/2026/06/8771-300x300.png',
      brand_slug: '100hp',
      brand_title: '100HP'
    },
    {
      product_id: '8262',
      game_code: '1189',
      game_name: '3 Kings Scratch',
      category: 'Instant',
      game_img: 'https://igamingapis.com/wp-content/uploads/2026/04/1189-238x300.png',
      brand_slug: 'bgaming',
      brand_title: 'BGaming'
    },
    {
      product_id: '13038',
      game_code: '1189',
      game_name: 'Aztec Magic',
      category: 'Slots',
      game_img: 'https://igamingapis.com/wp-content/uploads/2026/07/aztecmagic-300x300.png',
      brand_slug: 'bgaming',
      brand_title: 'BGaming'
    },
    {
      product_id: '9840',
      game_code: '8786',
      game_name: 'Astronaut',
      category: 'Crash',
      game_img: 'https://igamingapis.com/wp-content/uploads/2026/06/8786-224x300.png',
      brand_slug: '100hp',
      brand_title: '100HP'
    },
    {
      product_id: '10429',
      game_code: '10429',
      game_name: 'Mines',
      category: 'Instant',
      game_img: 'https://igamingapis.com/wp-content/uploads/2026/07/mines-300x300.png',
      brand_slug: 'spribe',
      brand_title: 'Spribe'
    },
    {
      product_id: '10430',
      game_code: '10430',
      game_name: 'Plinko',
      category: 'Instant',
      game_img: 'https://igamingapis.com/wp-content/uploads/2026/07/plinko-300x300.png',
      brand_slug: 'spribe',
      brand_title: 'Spribe'
    },
    {
      product_id: '6982',
      game_code: '6312',
      game_name: '2 Hand Casino Hold’em',
      category: 'Live Casino',
      game_img: 'https://igamingapis.com/wp-content/uploads/2026/04/6312-214x300.jpg',
      brand_slug: 'evolution-live',
      brand_title: 'Evolution Live'
    },
    {
      product_id: '9836',
      game_code: '8784',
      game_name: 'Blackjack Classic',
      category: 'Cards',
      game_img: 'https://igamingapis.com/wp-content/uploads/2026/06/8784.png',
      brand_slug: '100hp',
      brand_title: '100HP'
    },
    {
      product_id: '12100',
      game_code: '12100',
      game_name: 'Birds Party',
      category: 'Slots',
      game_img: 'https://igamingapis.com/wp-content/uploads/2026/07/birds_party-300x300.png',
      brand_slug: 'jdb',
      brand_title: 'JDB'
    },
    {
      product_id: '10020',
      game_code: '10020',
      game_name: 'Gates of Olympus',
      category: 'Slots',
      game_img: 'https://igamingapis.com/wp-content/uploads/2026/07/gates_of_olympus-300x300.png',
      brand_slug: 'pragmaticplay-asia',
      brand_title: 'Pragmatic Play'
    },
    {
      product_id: '10021',
      game_code: '10021',
      game_name: 'Sweet Bonanza',
      category: 'Slots',
      game_img: 'https://igamingapis.com/wp-content/uploads/2026/07/sweet_bonanza-300x300.png',
      brand_slug: 'pragmaticplay-asia',
      brand_title: 'Pragmatic Play'
    }
  ];

  res.json({ status: true, total: verifiedFeatured.length, games: verifiedFeatured });
});

// 4. Verify Agent Code (Supports master code & all client provisioned Operator IDs)
app.post('/api/verify-agent', (req, res) => {
  const { code } = req.body;
  const cleanCode = (code || '').trim().toLowerCase();
  const masterCodes = ['hdsoftapi1', 'hdsoftapi', 'vip2026', 'admin'];

  // Master Admin verification
  if (masterCodes.includes(cleanCode)) {
    return res.json({
      success: true,
      message: 'Access Granted. Master Developer Mode Active.',
      launch_pass: 'VIP_' + crypto.randomBytes(12).toString('hex'),
      agent_code: code.trim(),
      role: 'master'
    });
  }

  // Client Operator Verification from registered orders
  const orders = getOrders();
  const matched = orders.find(o => 
    (o.operator_id && o.operator_id.toLowerCase() === cleanCode) ||
    (o.order_id && o.order_id.toLowerCase() === cleanCode) ||
    (o.api_key && o.api_key.toLowerCase() === cleanCode)
  );

  if (matched) {
    return res.json({
      success: true,
      message: `Verified Operator License (${matched.plan_name})`,
      launch_pass: 'OPERATOR_' + crypto.randomBytes(12).toString('hex'),
      agent_code: matched.operator_id,
      operator_id: matched.operator_id,
      wallet_credit: matched.wallet_credit,
      plan: matched.plan,
      role: 'operator'
    });
  }

  return res.status(400).json({
    success: false,
    message: 'Invalid agent code. Purchase an API license or contact VIP manager on WhatsApp.'
  });
});

// 5. Game Launcher (Connects directly to Live Gateway to get authentic launch URLs)
app.post('/api/launch-game', async (req, res) => {
  const { productId, brandSlug, gameTitle, gameCode, mode } = req.body;
  console.log(`[LAUNCH REQUEST] PID: ${productId}, Brand: ${brandSlug}, Title: ${gameTitle}`);

  // If live mode, fetch authentic launch URL from provider
  if (mode !== 'simulator_only') {
    const liveResult = await gateway.launchGame(productId, brandSlug);
    if (liveResult.success && liveResult.url) {
      return res.json({
        success: true,
        type: 'live',
        url: liveResult.url,
        game_uid: liveResult.game_uid || productId,
        open_in_tab: !!liveResult.open_in_tab
      });
    }

    // If upstream returns 'Under maintenance'
    if (liveResult.message === 'Under maintenance') {
      console.log(`[INFO] Upstream provider reports maintenance for PID ${productId || brandSlug}.`);
    }
  }

  // High-fidelity fallback simulator so demo is never broken
  const safeName = encodeURIComponent(gameTitle || 'VIP Casino Game');
  const safeBrand = encodeURIComponent(brandSlug || 'Top Tier');
  const demoUrl = `/demo-player.html?game=${safeName}&brand=${safeBrand}&code=${encodeURIComponent(gameCode || productId || '1001')}`;

  return res.json({
    success: true,
    type: 'simulator',
    url: demoUrl,
    game_uid: gameCode || productId || '1001',
    note: 'Fallback to instant playable simulator'
  });
});

// 6. SoftAPI Live Encryption Playground Tool
app.post('/api/encrypt-payload', (req, res) => {
  try {
    const { token, secret, payload } = req.body;
    if (!token || !secret || !payload) {
      return res.status(400).json({ success: false, error: 'token, secret, and payload are required' });
    }
    if (secret.length !== 32) {
      return res.status(400).json({ success: false, error: 'API Secret must be exactly 32 characters' });
    }

    const payloadObj = typeof payload === 'string' ? JSON.parse(payload) : payload;
    payloadObj.timestamp = Date.now();
    payloadObj.token = token;

    const plaintext = JSON.stringify(payloadObj);
    const encrypted = aes256EcbEncrypt(plaintext, secret);

    return res.json({
      success: true,
      request_body: {
        token: token,
        payload: encrypted
      },
      plaintext_payload: payloadObj
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// 7. SoftAPI Callback Webhook Receiver
app.post('/api/softapi/callback', (req, res) => {
  const secret = req.headers['x-api-secret'] || 'DEMO_SECRET_32_CHARACTERS_LONG!';
  let event = req.body;

  if (event && event.payload) {
    try {
      const decrypted = aes256EcbDecrypt(event.payload, secret);
      event = JSON.parse(decrypted);
    } catch (e) {
      console.warn('[CALLBACK DECRYPT ERROR]', e.message);
    }
  }

  console.log('[CALLBACK EVENT RECEIVED]', JSON.stringify(event));
  res.json({ code: 0, msg: 'OK', processed_at: Date.now() });
});

// 8. USDT Checkout & Instant License Provisioning
app.post('/api/checkout', (req, res) => {
  const { plan, providers, email, keysOption, network } = req.body;
  const orderId = 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();

  let totalUsdt = 50;
  let walletCredit = 12;
  let validity = '3 Days';
  let planName = '3-Day Testing License';

  if (plan === 'trial') {
    totalUsdt = 50;
    walletCredit = 12;
    validity = '3 Days Testing Access';
    planName = '3-Day Trial License';
  } else if (plan === '10years') {
    totalUsdt = 800;
    walletCredit = 100;
    validity = '10 Years Commercial License';
    planName = '10 Years All Providers License';
  } else if (plan === 'vip') {
    totalUsdt = 1500;
    walletCredit = 900;
    validity = '10 Years VIP Tier License';
    planName = 'VIP 10 Years Unlimited License';
  } else if (plan === 'custom' || Array.isArray(providers)) {
    const list = Array.isArray(providers) ? providers : [];
    totalUsdt = list.reduce((acc, p) => {
      const name = typeof p === 'string' ? p : (p.name || p.brand_title || '');
      const key = name.trim().toLowerCase();
      return acc + (brandPrices[key] || 45);
    }, 0);
    if (totalUsdt === 0) totalUsdt = 45;
    walletCredit = Math.round(totalUsdt * 0.25);
    validity = 'Lifetime Modular License';
    planName = `Custom Providers Bundle (${list.length} Brands)`;
  }

  // Provision unique SoftAPI credentials for this client
  const operatorId = 'AGT-' + Math.floor(100000 + Math.random() * 900000);
  const apiKey = 'ak_' + crypto.randomBytes(16).toString('hex');
  const apiSecret = crypto.randomBytes(16).toString('hex'); // 32 characters

  const depositAddress = (network || 'trc20') === 'trc20'
    ? 'TXb9Rz8KxYp6Wm4Qv2Ln7Sd1Fe3Hg5Jt8A'
    : '0x71C5A8c3B6dF10a24E9c90F61517aBE3d528b1E2';

  const orderData = {
    order_id: orderId,
    plan: plan || 'trial',
    plan_name: planName,
    total_usdt: totalUsdt,
    wallet_credit: walletCredit,
    validity: validity,
    deposit_network: (network || 'trc20').toUpperCase(),
    deposit_address: depositAddress,
    account_email: email || 'operator@pending.com',
    keys_option: keysOption || 'single',
    operator_id: operatorId,
    api_key: apiKey,
    api_secret: apiSecret,
    catalog_endpoint: '/api/providers',
    launch_endpoint: '/api/launch-game',
    status: 'Pending USDT Deposit',
    created_at: new Date().toISOString()
  };

  saveOrder(orderData);

  res.json({
    success: true,
    ...orderData,
    whatsapp_confirm_link: `https://wa.me/918052354357?text=${encodeURIComponent(`Hello AllInOne API Admin, I placed Order #${orderId} for ${totalUsdt} USDT (${planName}). My account email is ${email}. Operator ID: ${operatorId}. Please verify my USDT deposit and activate.`)}`,
    telegram_confirm_link: `https://t.me/hdsoftapi`
  });
});

// 9. Admin & Client Order Lookup
app.get('/api/orders/:orderId', (req, res) => {
  const orders = getOrders();
  const order = orders.find(o => o.order_id === req.params.orderId);
  if (order) {
    return res.json({ success: true, order });
  }
  res.status(404).json({ success: false, message: 'Order not found' });
});

app.get('/api/admin/orders', (req, res) => {
  const orders = getOrders();
  res.json({ success: true, total: orders.length, orders });
});

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

setInterval(() => {}, 60000);

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`[AllInOne API Engine] Server running at http://localhost:${PORT}`);
    console.log(`[GATEWAY ACTIVE] Live Provider Launch Gateway Online`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
