// Providers & Games Catalog Module - 100% Mirroring igamingapis.com/products/ & /brand/:slug/
const Catalog = {
  providers: [],
  selectedCategory: 'all',
  searchQuery: '',
  activeBrand: null,
  currentBrandGames: [],
  brandSearchQuery: '',

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
    const heroCount = document.querySelector('[data-target="169"]');
    if (heroCount) heroCount.textContent = this.providers.length + '+';
  },

  bindEvents() {
    // 10 Category tabs matching igamingapis.com/products/
    document.querySelectorAll('.cat-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.cat-tab-btn').forEach(b => {
          b.classList.remove('bg-amber-500', 'text-black', 'border-amber-500');
          b.classList.add('bg-zinc-900', 'text-zinc-300', 'border-white/10');
        });
        btn.classList.add('bg-amber-500', 'text-black', 'border-amber-500');
        btn.classList.remove('bg-zinc-900', 'text-zinc-300', 'border-white/10');

        this.selectedCategory = btn.getAttribute('data-cat') || 'all';
        this.renderProviders();
      });
    });

    // Provider search input
    const searchInput = document.getElementById('providerSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.renderProviders();
      });
    }

    // In-brand game search input
    const brandGameSearch = document.getElementById('brandGameSearchInput');
    if (brandGameSearch) {
      brandGameSearch.addEventListener('input', (e) => {
        this.brandSearchQuery = e.target.value.trim().toLowerCase();
        this.filterBrandGames(this.brandSearchQuery);
      });
    }

    // Popstate navigation for direct URLs and browser Back/Forward
    window.addEventListener('popstate', () => {
      this.checkRoute();
    });
  },

  checkRoute() {
    const path = window.location.pathname.toLowerCase();
    const brandMatch = path.match(/\/brand\/([a-z0-9_-]+)/);

    if (brandMatch) {
      const slug = brandMatch[1];
      this.openBrandBySlug(slug, false);
    } else if (path.includes('/products')) {
      this.showProductsView(null, false);
    } else if (path.includes('/buy') || window.location.hash === '#pricing') {
      const pricingSection = document.getElementById('pricing');
      if (pricingSection) {
        setTimeout(() => pricingSection.scrollIntoView({ behavior: 'smooth' }), 300);
      }
    }
  },

  getFilteredProviders() {
    let list = this.providers.filter(p => {
      let matchesCat = true;
      if (this.selectedCategory === 'hot') {
        matchesCat = !!p.is_hot;
      } else if (this.selectedCategory !== 'all') {
        const cat = (p.category || '').toLowerCase();
        matchesCat = cat === this.selectedCategory || cat.includes(this.selectedCategory);
      }

      const title = (p.brand_title || '').toLowerCase();
      const slug = (p.brand_slug || '').toLowerCase();
      const matchesSearch = !this.searchQuery || title.includes(this.searchQuery) || slug.includes(this.searchQuery);

      return matchesCat && matchesSearch;
    });

    // When HOT is selected, sort in authentic rank order (#1 JILI, #2 Spribe, #3 Pragmatic...)
    if (this.selectedCategory === 'hot') {
      list.sort((a, b) => {
        const ra = parseInt(a.rank || '0', 10) || 999;
        const rb = parseInt(b.rank || '0', 10) || 999;
        if (ra !== rb) return ra - rb;
        return (a.brand_title || '').localeCompare(b.brand_title || '');
      });
    }

    return list;
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
      const rankNum = parseInt(p.rank || '0', 10);
      const rankLabel = rankNum > 0 ? `#${rankNum}` : '';
      const fallbackLogo = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.brand_title)}&background=18181b&color=f59e0b&bold=true&size=128`;
      const logoUrl = p.logo || fallbackLogo;
      const brandSlug = p.brand_slug || p.brand_title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const gameCountText = p.cached_games_count ? `${p.cached_games_count} Games` : '100+ Games';

      return `
        <div onclick="Catalog.openBrandBySlug('${brandSlug}', true)" 
             class="brand-card p-4 flex flex-col justify-between cursor-pointer group hover:border-amber-500/50 transition">
          
          <div class="flex items-center justify-between mb-3 h-6">
            <span class="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-900/90 text-zinc-400 border border-white/5">
              ${(p.category || 'SLOTS').toUpperCase()}
            </span>
            ${isHot ? `
              <span class="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-red-600 to-amber-500 text-white text-[9px] font-black tracking-wider shadow-sm">
                <i class="fa-solid fa-fire text-[8px]"></i>
                <span>HOT ${rankLabel}</span>
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
              <span class="text-[10px] text-zinc-400 font-medium flex items-center gap-1">
                <i class="fa-solid fa-circle text-[5px] text-emerald-400"></i> ${gameCountText}
              </span>
            </div>
            <button onclick="event.stopPropagation(); Catalog.openBrandBySlug('${brandSlug}', true)" 
                    title="Explore Provider"
                    class="w-7 h-7 rounded-lg bg-zinc-900 group-hover:bg-amber-500 group-hover:text-black flex items-center justify-center transition text-amber-400 border border-amber-500/20">
              <i class="fa-solid fa-arrow-right text-[10px]"></i>
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

  // Switch to Products Directory View (identical to igamingapis.com/products/)
  showProductsView(event, updateHistory = true) {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }

    const dirView = document.getElementById('productsDirectoryView');
    const brandView = document.getElementById('dedicatedBrandView');
    const brandModal = document.getElementById('brandDrawerModal');

    if (dirView) dirView.classList.remove('hidden');
    if (brandView) brandView.classList.add('hidden');
    if (brandModal) brandModal.classList.remove('active');

    this.activeBrand = null;

    if (updateHistory && window.history && window.history.pushState) {
      try {
        window.history.pushState(null, '', '/products');
      } catch (e) {}
    }

    const lobby = document.getElementById('lobby');
    if (lobby) {
      lobby.scrollIntoView({ behavior: 'smooth' });
    }
  },

  // Open dedicated Brand Showcase (identical to igamingapis.com/brand/100hp/)
  async openBrandBySlug(slug, updateHistory = true) {
    if (!slug) return;
    const cleanSlug = slug.trim().toLowerCase();

    let p = this.providers.find(x => {
      const bSlug = (x.brand_slug || '').toLowerCase();
      const bTitle = (x.brand_title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return bSlug === cleanSlug || bTitle === cleanSlug;
    });

    const brandTitle = p ? p.brand_title : (cleanSlug === '100hp' ? '100HP' : cleanSlug.toUpperCase());
    const fallbackLogo = `https://ui-avatars.com/api/?name=${encodeURIComponent(brandTitle)}&background=18181b&color=f59e0b&bold=true&size=128`;
    const brandLogo = (p && p.logo) ? p.logo : (cleanSlug === '100hp' ? 'https://igamingapis.com/wp-content/uploads/2026/07/download.png' : fallbackLogo);
    const category = p ? (p.category || 'slots').toUpperCase() : 'SLOTS';
    const isHot = p ? !!p.is_hot : false;
    const rank = p ? (p.rank || '') : '';

    this.activeBrand = {
      brandId: p ? p.brand_id : cleanSlug,
      brandTitle,
      brandLogo,
      brandSlug: cleanSlug,
      category,
      isHot,
      rank
    };

    // Update URL
    if (updateHistory && window.history && window.history.pushState) {
      try {
        window.history.pushState({ brandSlug: cleanSlug }, '', `/brand/${cleanSlug}/`);
      } catch (e) {}
    }

    // Toggle views to show Dedicated Brand View
    const dirView = document.getElementById('productsDirectoryView');
    const brandView = document.getElementById('dedicatedBrandView');
    if (dirView) dirView.classList.add('hidden');
    if (brandView) brandView.classList.remove('hidden');

    // Update Brand Showcase Header
    const bcName = document.getElementById('brandBreadcrumbName');
    const logoEl = document.getElementById('brandPageLogo');
    const titleEl = document.getElementById('brandPageTitle');
    const catEl = document.getElementById('brandPageCategory');
    const countEl = document.getElementById('brandPageGamesCount');
    const hotBadge = document.getElementById('brandPageHotBadge');
    const gamesGrid = document.getElementById('brandPageGamesGrid');

    if (bcName) bcName.textContent = brandTitle;
    if (logoEl) logoEl.src = brandLogo;
    if (titleEl) titleEl.textContent = brandTitle;
    if (catEl) catEl.textContent = category;
    if (hotBadge) {
      if (isHot) {
        hotBadge.classList.remove('hidden');
        hotBadge.innerHTML = `<i class="fa-solid fa-fire text-[9px]"></i> HOT ${rank ? '#' + rank : ''}`;
      } else {
        hotBadge.classList.add('hidden');
      }
    }

    // Reset in-brand search input
    const brandSearchInput = document.getElementById('brandGameSearchInput');
    if (brandSearchInput) brandSearchInput.value = '';
    this.brandSearchQuery = '';

    if (gamesGrid) {
      gamesGrid.innerHTML = `
        <div class="col-span-full py-16 text-center text-zinc-400">
          <i class="fa-solid fa-spinner fa-spin text-3xl text-amber-500 mb-3 block"></i>
          <p class="text-sm font-semibold">Loading verified games for ${brandTitle}...</p>
        </div>
      `;
    }

    // Smooth scroll to top of Brand Showcase
    const lobby = document.getElementById('lobby');
    if (lobby) {
      lobby.scrollIntoView({ behavior: 'smooth' });
    }

    // Fetch Brand Games
    try {
      const res = await fetch(`/api/brands/${cleanSlug}/games`);
      const data = await res.json();
      const games = data.games || [];
      this.currentBrandGames = games;

      if (countEl) countEl.textContent = `${games.length} Verified Games Available to Play`;
      this.renderBrandGames(games);
    } catch (err) {
      console.error('[CATALOG] Error loading brand games:', err);
      if (gamesGrid) {
        gamesGrid.innerHTML = `
          <div class="col-span-full py-16 text-center text-rose-400">
            <p class="text-sm font-semibold">Failed to fetch games for ${brandTitle}.</p>
          </div>
        `;
      }
    }
  },

  renderBrandGames(games) {
    const grid = document.getElementById('brandPageGamesGrid');
    if (!grid) return;

    if (!games || games.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full py-16 text-center text-zinc-500">
          <i class="fa-solid fa-box-open text-4xl mb-3 block"></i>
          <p class="text-sm font-semibold">No direct games found for this query.</p>
          <button onclick="Catalog.openBrandBySlug('${this.activeBrand?.brandSlug || '100hp'}', false)" class="mt-4 px-4 py-2 rounded-xl bg-zinc-800 text-xs text-white">Reset Search</button>
        </div>
      `;
      return;
    }

    const { brandTitle, brandLogo, brandSlug } = this.activeBrand || { brandTitle: 'Studio', brandLogo: '', brandSlug: '100hp' };

    grid.innerHTML = games.map(g => {
      const hasRealImg = !!(g.game_img && g.game_img.trim() && !g.game_img.includes('download.png'));
      const img = hasRealImg ? g.game_img : '';
      const pid = g.product_id || g.game_code || '9810';

      return `
        <div class="game-card group cursor-pointer" onclick="Launcher.openGame('${g.game_code || pid}', '${g.game_name.replace(/'/g, "\\'")}', '${brandTitle.replace(/'/g, "\\'")}', '${pid}', '${brandSlug}')">
          <div class="game-card-thumb">
            ${hasRealImg ? `
              <img src="${img}" alt="${g.game_name}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'w-full h-full flex flex-col items-center justify-center p-3 text-center bg-zinc-900\\'><img src=\\'${brandLogo}\\' class=\\'max-h-12 max-w-[75%] object-contain mb-2 filter drop-shadow\\'><span class=\\'text-xs font-bold text-white\\'>${g.game_name.replace(/'/g, "\\'")}</span></div>'" 
                   class="w-full h-full object-cover group-hover:scale-108 transition duration-300">
            ` : `
              <div class="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 text-center">
                <img src="${brandLogo}" alt="${brandTitle}" class="max-h-12 max-w-[75%] object-contain mb-2 filter drop-shadow opacity-90 group-hover:scale-105 transition" onerror="this.style.display='none'">
                <span class="text-xs font-extrabold text-amber-300 line-clamp-2 px-1">${g.game_name}</span>
                <span class="text-[9px] text-zinc-500 uppercase tracking-widest mt-1">ALLINONE CERTIFIED</span>
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
  },

  filterBrandGames(query) {
    if (!query) {
      this.renderBrandGames(this.currentBrandGames);
      return;
    }
    const filtered = this.currentBrandGames.filter(g => {
      const name = (g.game_name || '').toLowerCase();
      const code = String(g.game_code || '').toLowerCase();
      const pid = String(g.product_id || '').toLowerCase();
      return name.includes(query) || code.includes(query) || pid.includes(query);
    });
    this.renderBrandGames(filtered);
  },

  launchTopGame() {
    if (!this.activeBrand) return;
    const { brandTitle, brandSlug } = this.activeBrand;

    if (this.currentBrandGames && this.currentBrandGames.length > 0) {
      const g = this.currentBrandGames[0];
      Launcher.openGame(g.game_code || g.product_id, g.game_name, brandTitle, g.product_id, brandSlug);
    } else {
      Launcher.openGame('default', `${brandTitle} Live Session`, brandTitle, '9810', brandSlug);
    }
  },

  quickLaunchBrand(brandId, brandTitle, brandSlug) {
    this.openBrandBySlug(brandSlug || brandId, true);
  },

  // Backwards compatibility drawer functions
  openBrandDrawer(brandId, brandTitle, brandLogo, brandSlug, updateHistory = true) {
    this.openBrandBySlug(brandSlug || brandId, updateHistory);
  },

  closeBrandDrawer() {
    this.showProductsView(null, true);
  }
};
