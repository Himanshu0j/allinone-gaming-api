// Cinematic In-App Game Launcher Module
const Launcher = {
  currentProgress: 0,
  progressTimer: null,
  isOpen: false,
  activeGameUrl: '',
  activeGameTitle: '',

  async openGame(gameCode, gameTitle, brandTitle, productId = null, brandSlug = '') {
    // 1. Immediately close brand drawer so it never overlaps or covers the game
    if (window.Catalog && typeof window.Catalog.closeBrandDrawer === 'function') {
      window.Catalog.closeBrandDrawer();
    }
    const brandModal = document.getElementById('brandDrawerModal');
    if (brandModal) {
      brandModal.classList.remove('active');
    }

    const modal = document.getElementById('gameModal');
    const iframe = document.getElementById('gameIframe');
    const loader = document.getElementById('gameLoader');
    const titleEl = document.getElementById('gameModalTitle');
    const brandEl = document.getElementById('gameModalBrand');
    const popoutBtn = document.getElementById('gamePopoutBtn');

    if (!modal) return;

    this.isOpen = true;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    this.activeGameTitle = gameTitle || 'VIP Casino Game';
    titleEl.textContent = this.activeGameTitle;
    brandEl.textContent = `${brandTitle || 'Top Tier'} · Live Gateway Session`;

    // Show loading
    loader.classList.remove('hidden');
    iframe.classList.add('hidden');
    iframe.src = 'about:blank';
    this.startProgress();

    try {
      console.log(`[LAUNCHING] ${gameTitle} (PID: ${productId}, Brand: ${brandSlug})`);

      const res = await fetch('/api/launch-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: (productId && productId !== 'default') ? productId : null,
          brandSlug: brandSlug || '',
          gameCode: gameCode || '',
          gameTitle: gameTitle
        })
      });

      const data = await res.json();
      console.log('[LAUNCH RESULT]', data);

      let targetUrl = '';
      if (data.success && data.url) {
        targetUrl = data.url;
        this.activeGameUrl = targetUrl;
      } else {
        // Fallback to simulator
        targetUrl = `/demo-player.html?game=${encodeURIComponent(gameTitle)}&brand=${encodeURIComponent(brandTitle)}`;
        this.activeGameUrl = targetUrl;
      }

      if (popoutBtn) {
        popoutBtn.classList.remove('hidden');
      }

      // Complete progress smoothly
      this.setProgress(92);
      setTimeout(() => {
        this.setProgress(100);
        setTimeout(() => {
          this.clearProgress();
          loader.classList.add('hidden');
          iframe.classList.remove('hidden');
          iframe.src = targetUrl;

          // If provider requests open_in_tab
          if (data.open_in_tab) {
            try {
              const win = window.open(targetUrl, '_blank', 'noopener,noreferrer');
              if (!win || win.closed || typeof win.closed === 'undefined') {
                if (window.App && typeof window.App.showToast === 'function') {
                  window.App.showToast('Popup blocked by browser. Click "Open VIP Window" at top right to play!', 'info');
                }
              }
            } catch (popErr) {
              console.warn('[POPUP BLOCKED]', popErr);
            }
          }
        }, 300);
      }, 350);

    } catch (err) {
      console.warn('[LAUNCHER ERROR]', err);
      setTimeout(() => {
        this.setProgress(100);
        loader.classList.add('hidden');
        iframe.classList.remove('hidden');
        const fallbackUrl = `/demo-player.html?game=${encodeURIComponent(gameTitle)}&brand=${encodeURIComponent(brandTitle)}`;
        iframe.src = fallbackUrl;
        this.activeGameUrl = fallbackUrl;
      }, 400);
    }
  },

  startProgress() {
    this.clearProgress();
    this.setProgress(12);
    this.progressTimer = setInterval(() => {
      if (this.currentProgress >= 90) {
        clearInterval(this.progressTimer);
        return;
      }
      const step = this.currentProgress < 50 ? 10 : 5;
      this.setProgress(this.currentProgress + step);
    }, 90);
  },

  setProgress(val) {
    this.currentProgress = Math.min(100, Math.max(0, val));
    const textEl = document.getElementById('gameProgressText');
    const barEl = document.getElementById('gameProgressBar');
    if (textEl) textEl.textContent = `${this.currentProgress}%`;
    if (barEl) barEl.style.width = `${this.currentProgress}%`;
  },

  clearProgress() {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
    this.currentProgress = 0;
  },

  openInNewWindow() {
    if (this.activeGameUrl && this.activeGameUrl !== 'about:blank') {
      window.open(this.activeGameUrl, '_blank', 'noopener,noreferrer');
      App.showToast('Game opened in dedicated VIP window!', 'success');
    }
  },

  close() {
    const modal = document.getElementById('gameModal');
    const iframe = document.getElementById('gameIframe');
    if (!modal) return;

    this.isOpen = false;
    this.clearProgress();
    modal.classList.remove('active');
    document.body.style.overflow = '';
    if (iframe) iframe.src = 'about:blank';
    this.activeGameUrl = '';
  },

  toggleFullscreen() {
    const frameContainer = document.getElementById('gameModalBody');
    if (!frameContainer) return;

    if (!document.fullscreenElement) {
      frameContainer.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }
};
