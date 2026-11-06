// Providers and Games Catalog Module
const Catalog = {
  providers: [],
  selectedCategory: 'all',
  searchQuery: '',
  activeBrand: null,

  async init() {
    await this.loadProviders();
    await this.loadFeaturedGames();
    this.bindEvents();
    this.checkRoute();
  },

  async loadProviders() {
    try {
      const res = await fetch('/api/providers');
      const data = await res.json();
      if (data.status && data.providers) {
        this.providers = data.providers;
        this.renderProviders();
        this.updateCounts();
      }
    } catch (e) {
      console.error('[CATALOG] Error loading providers:', e);
    }
  },

  async loadFeaturedGames() {
    try {
      const res = await fetch('/api/games/featured');
      const data = await res.json();
      if (data.status && data.games) {
        this.renderFeaturedGames(data.games);
      }
    } catch (e) {
      console.error('[CATALOG] Error loading featured games:', e);
    }
  },

  updateCounts() {
    const el = document.getElementById('statTotalProviders');
    if (el) el.textContent = this.providers.length + '+';
  },

  bindEvents() {
    // Category tabs
    document.querySelectorAll('.cat-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.cat-tab-btn').forEach(b => {
          b.classList.remove('bg-amber-500', 'text-black', 'border-amber-500');
          b.classList.add('bg-zinc-900', 'text-zinc-300', 'border-white/10');
        });
        btn.classList.add('bg-amber-500', 'text-black', 'border-amber-500');
        btn.classList.remove('bg-zinc-900', 'text-zinc-300', 'border-white/10');

        this.selectedCategory = btn.getAttribute('data-cat');
        this.renderProviders();
      });
    });

    // Provider search
    const searchInput = document.getElementById('providerSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.renderProviders();
      });
    }

    // Popstate navigation for direct brand URLs
    window.addEventListener('popstate', () => {
      this.checkRoute();
    });
  },

  checkRoute() {
    const path = window.location.pathname.toLowerCase();
    const brandMatch = path.match(/\/brand\/([a-z0-9_-]+)/);
    if (brandMatch) {
      const slug = brandMatch[1];
      this.openBrandBySlug(slug);
    } else if (path.includes('/buy') || window.location.hash === '#pricing') {
      const pricingSection = document.getElementById('pricing');
      if (pricingSection) {
        setTimeout(() => pricingSection.scrollIntoView({ behavior: 'smooth' }), 300);
      }
    }
  },

  async openBrandBySlug(slug) {
    if (!slug) return;
    const cleanSlug = slug.trim().toLowerCase();
    let p = this.providers.find(x => {
      const bSlug = (x.brand_slug || '').toLowerCase();
      const bTitle = (x.brand_title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return bSlug === cleanSlug || bTitle === cleanSlug;
    });

    if (p) {
      this.openBrandDrawer(p.brand_id, p.brand_title, p.logo, p.brand_slug, false);
    } else {
      const title = cleanSlug === '100hp' ? '100HP' : cleanSlug.toUpperCase();
      const logo = `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&background=18181b&color=f59e0b&bold=true&size=128`;
      this.openBrandDrawer(cleanSlug, title, logo, cleanSlug, false);
    }
  },

  getFilteredProviders() {
    return this.providers.filter(p => {
      let matchesCat = true;
      if (this.selectedCategory === 'hot') {
        matchesCat = !!p.is_hot;
      } else if (this.selectedCategory !== 'all') {
        const cat = (p.category || '').toLowerCase();
        matchesCat = cat.includes(this.selectedCategory);
      }

      const title = (p.brand_title || '').toLowerCase();
      const matchesSearch = !this.searchQuery || title.includes(this.searchQuery);

      return matchesCat && matchesSearch;
    });
  },

  renderProviders() {
    const grid = document.getElementById('providersGrid');
    if (!grid) return;

    const filtered = this.getFilteredProviders();
    const countEl = document.getElementById('filteredProvidersCount');
    if (countEl) countEl.textContent = `${filtered.length} Providers Available`;

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full py-16 text-center text-zinc-500">
          <i class="fa-solid fa-gamepad text-4xl mb-3 block"></i>
          <p class="text-base font-semibold">No gaming providers found matching your criteria.</p>
          <button onclick="Catalog.resetFilters()" class="mt-4 px-4 py-2 rounded-lg bg-zinc-800 text-xs text-white hover:bg-zinc-700">Clear Filters</button>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(p => {
      const isHot = p.is_hot;
      const rank = p.rank && p.rank !== '0' ? `#${p.rank}` : '';
      const fallbackLogo = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.brand_title)}&background=18181b&color=f59e0b&bold=true&size=128`;
      const logoUrl = p.logo || fallbackLogo;
      const brandSlug = p.brand_slug || p.brand_title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      return `
        <div onclick="Catalog.openBrandDrawer('${p.brand_id}', '${p.brand_title.replace(/'/g, "\\'")}', '${logoUrl}', '${brandSlug}')" 
             class="brand-card p-4 flex flex-col justify-between cursor-pointer group">
          
          <div class="flex items-center justify-between mb-3 h-6">
            <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-white/5">
              ${p.category || 'SLOTS'}
            </span>
            ${isHot ? `
              <span class="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-extrabold tracking-wider">
                <i class="fa-solid fa-fire text-amber-500 text-[9px]"></i>
                <span>HOT ${rank}</span>
              </span>
            ` : ''}
          </div>

          <div class="h-16 flex items-center justify-center my-1 px-2">
            <img src="${logoUrl}" 
                 alt="${p.brand_title}" 
                 loading="lazy" 
                 onerror="this.src='${fallbackLogo}'"
                 class="brand-logo-img max-h-12 max-w-full object-contain filter drop-shadow">
          </div>

          <div class="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
            <div class="truncate pr-2">
              <h4 class="font-bold text-sm text-white group-hover:text-amber-400 transition truncate">${p.brand_title}</h4>
              <span class="text-[11px] text-amber-400/90 font-medium flex items-center gap-1">
                <i class="fa-solid fa-play text-[8px]"></i> Explore & Play
              </span>
            </div>
            <button onclick="event.stopPropagation(); Catalog.quickLaunchBrand('${p.brand_id}', '${p.brand_title.replace(/'/g, "\\'")}', '${brandSlug}')" 
                    title="Instant Live Launch"
                    class="w-7 h-7 rounded-lg bg-zinc-800 group-hover:bg-amber-500 group-hover:text-black flex items-center justify-center transition text-amber-400 border border-amber-500/20">
              <i class="fa-solid fa-bolt text-[11px]"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  resetFilters() {
    this.selectedCategory = 'all';
    this.searchQuery = '';
    const input = document.getElementById('providerSearchInput');
    if (input) input.value = '';
    document.querySelectorAll('.cat-tab-btn').forEach((b, idx) => {
      if (idx === 0) {
        b.classList.add('bg-amber-500', 'text-black', 'border-amber-500');
        b.classList.remove('bg-zinc-900', 'text-zinc-300', 'border-white/10');
      } else {
        b.classList.remove('bg-amber-500', 'text-black', 'border-amber-500');
        b.classList.add('bg-zinc-900', 'text-zinc-300', 'border-white/10');
      }
    });
    this.renderProviders();
  },

  renderFeaturedGames(games) {
    const container = document.getElementById('featuredGamesGrid');
    if (!container) return;

    container.innerHTML = games.map(g => {
      const fallbackImg = 'https://igamingapis.com/wp-content/uploads/2026/06/8771-300x300.png';
      const img = g.game_img || fallbackImg;
      const pid = g.product_id || '9810';
      const bSlug = g.brand_slug || '100hp';

      return `
        <div class="game-card group cursor-pointer" onclick="Launcher.openGame('${g.game_code || pid}', '${g.game_name.replace(/'/g, "\\'")}', '${g.brand_title.replace(/'/g, "\\'")}', '${pid}', '${bSlug}')">
          <div class="game-card-thumb">
            <img src="${img}" alt="${g.game_name}" loading="lazy" onerror="this.src='${fallbackImg}'" 
                 class="w-full h-full object-cover group-hover:scale-108 transition duration-300">
            
            <span class="absolute top-2.5 left-2.5 px-2 py-0.5 rounded text-[10px] font-bold bg-black/75 backdrop-blur-md text-amber-300 border border-amber-500/30">
              ${g.category || 'Featured'}
            </span>

            <span class="absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-900/80 backdrop-blur-md text-zinc-300 border border-white/10">
              ${g.brand_title}
            </span>

            <div class="play-overlay absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center space-y-2">
              <div class="w-12 h-12 rounded-full bg-amber-500 text-black flex items-center justify-center shadow-lg shadow-amber-500/40 transform group-hover:scale-110 transition">
                <i class="fa-solid fa-play text-base ml-0.5"></i>
              </div>
              <span class="text-xs font-extrabold uppercase tracking-wider text-white">LIVE LAUNCH</span>
            </div>
          </div>

          <div class="p-3 bg-zinc-950/90 border-t border-white/5 flex items-center justify-between">
            <div class="truncate pr-2">
              <h5 class="font-bold text-sm text-white group-hover:text-amber-400 transition truncate">${g.game_name}</h5>
              <p class="text-[11px] text-zinc-400 truncate">${g.brand_title}</p>
            </div>
            <button class="px-2.5 py-1 rounded bg-zinc-900 hover:bg-amber-500 hover:text-black text-[11px] font-bold text-amber-400 transition border border-amber-500/20">
              PLAY
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  // Open brand games drawer with real product IDs for launch
  async openBrandDrawer(brandId, brandTitle, brandLogo, brandSlug, updateHistory = true) {
    this.activeBrand = { brandId, brandTitle, brandLogo, brandSlug };
    const modal = document.getElementById('brandDrawerModal');
    const titleEl = document.getElementById('brandDrawerTitle');
    const logoEl = document.getElementById('brandDrawerLogo');
    const gamesGrid = document.getElementById('brandDrawerGamesGrid');
    const countEl = document.getElementById('brandDrawerCount');

    titleEl.textContent = brandTitle;
    logoEl.src = brandLogo;
    gamesGrid.innerHTML = `
      <div class="col-span-full py-16 text-center text-zinc-400">
        <i class="fa-solid fa-spinner fa-spin text-3xl text-amber-500 mb-3 block"></i>
        <p class="text-sm font-semibold">Loading verified games for ${brandTitle}...</p>
      </div>
    `;
    modal.classList.add('active');

    if (updateHistory && brandSlug && window.history && window.history.pushState) {
      try {
        window.history.pushState({ brandSlug }, '', `/brand/${brandSlug}/`);
      } catch (e) {}
    }

    try {
      const res = await fetch(`/api/brands/${brandSlug || brandId}/games`);
      const data = await res.json();
      const games = data.games || [];
      const resolvedSlug = data.brand_slug || brandSlug;

      countEl.textContent = `${games.length} Games Ready to Launch`;

      if (games.length === 0) {
        gamesGrid.innerHTML = `
          <div class="col-span-full py-16 text-center text-zinc-500">
            <i class="fa-solid fa-box-open text-4xl mb-3 block"></i>
            <p class="text-sm font-semibold">No direct catalog list returned for this provider.</p>
            <p class="text-xs text-zinc-600 mt-1">API license gives unified access to all titles via game code.</p>
            <button onclick="Launcher.openGame('default', '${brandTitle} Live Demo', '${brandTitle}', '9810', '${resolvedSlug}')" class="mt-4 btn-gold px-5 py-2 rounded-xl text-xs font-bold">
              Launch Provider Demo
            </button>
          </div>
        `;
        return;
      }

      gamesGrid.innerHTML = games.map(g => {
        const hasRealImg = !!(g.game_img && g.game_img.trim() && !g.game_img.includes('download.png'));
        const img = hasRealImg ? g.game_img : '';
        const pid = g.product_id || g.game_code || '9810';

        return `
          <div class="game-card group cursor-pointer" onclick="Launcher.openGame('${g.game_code || pid}', '${g.game_name.replace(/'/g, "\\'")}', '${brandTitle.replace(/'/g, "\\'")}', '${pid}', '${resolvedSlug}')">
            <div class="game-card-thumb">
              ${hasRealImg ? `
                <img src="${img}" alt="${g.game_name}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'w-full h-full flex flex-col items-center justify-center p-3 text-center bg-zinc-900\\'><img src=\\'${brandLogo}\\' class=\\'max-h-12 max-w-[75%] object-contain mb-2 filter drop-shadow\\'><span class=\\'text-xs font-bold text-white\\'>${g.game_name.replace(/'/g, "\\'")}</span></div>'" 
                     class="w-full h-full object-cover group-hover:scale-108 transition duration-300">
              ` : `
                <div class="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 text-center">
                  <img src="${brandLogo}" alt="${brandTitle}" class="max-h-12 max-w-[75%] object-contain mb-2 filter drop-shadow opacity-90 group-hover:scale-105 transition" onerror="this.style.display='none'">
                  <span class="text-xs font-extrabold text-amber-300 line-clamp-2 px-1">${g.game_name}</span>
                  <span class="text-[9px] text-zinc-500 uppercase tracking-widest mt-1">SOFTAPI CERTIFIED</span>
                </div>
              `}
              
              <div class="play-overlay absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center space-y-2">
                <div class="w-12 h-12 rounded-full bg-amber-500 text-black flex items-center justify-center shadow-lg shadow-amber-500/40 transform group-hover:scale-110 transition">
                  <i class="fa-solid fa-play text-base ml-0.5"></i>
                </div>
                <span class="text-xs font-extrabold uppercase tracking-wider text-white">PLAY LIVE</span>
              </div>
            </div>

            <div class="p-3 bg-zinc-950/90 border-t border-white/5 flex flex-col justify-between flex-1">
              <h5 class="font-bold text-xs text-white group-hover:text-amber-400 transition truncate">${g.game_name}</h5>
              <div class="flex items-center justify-between mt-2 text-[10px] text-zinc-400">
                <span class="font-mono text-[9px] text-zinc-500">ID: ${pid}</span>
                <span class="text-emerald-400 font-semibold flex items-center gap-1"><i class="fa-solid fa-circle text-[6px]"></i> Live</span>
              </div>
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      gamesGrid.innerHTML = `
        <div class="col-span-full py-16 text-center text-rose-400">
          <p class="text-sm font-semibold">Failed to fetch games for ${brandTitle}.</p>
        </div>
      `;
    }
  },

  launchTopGame() {
    if (!this.activeBrand) return;
    const { brandId, brandTitle, brandSlug } = this.activeBrand;
    this.closeBrandDrawer();
    Launcher.openGame('default', `${brandTitle} Live Session`, brandTitle, null, brandSlug);
  },

  quickLaunchBrand(brandId, brandTitle, brandSlug) {
    Launcher.openGame('default', `${brandTitle} Live Session`, brandTitle, null, brandSlug);
  },

  closeBrandDrawer() {
    const modal = document.getElementById('brandDrawerModal');
    if (modal) modal.classList.remove('active');
    try {
      if (window.history && window.history.pushState && window.location.pathname.includes('/brand/')) {
        window.history.pushState(null, '', '/');
      }
    } catch (e) {}
  }
};
