// Cinematic In-App Game Launcher Module
const Launcher = {
  currentProgress: 0,
  progressTimer: null,
  isOpen: false,
  activeGameUrl: '',
  activeGameTitle: '',

  async openGame(gameCode, gameTitle, brandTitle, productId = null, brandSlug = '') {
    // 1. Instantly reserve popup tab synchronously inside user click gesture (100% unblocked by browsers!)
    let launchTab = null;
    try {
      launchTab = window.open('about:blank', '_blank');
      if (launchTab) {
        launchTab.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Launching ${gameTitle || 'Game'} | AllInOne API</title>
  <link rel="icon" href="https://igamingapis.com/wp-content/uploads/2026/07/cropped-logo-1-2-2-32x32.png">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #090d16;
      color: #f3f4f6;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      overflow: hidden;
    }
    .launch-card {
      background: linear-gradient(135deg, rgba(24, 24, 27, 0.96), rgba(9, 9, 11, 0.98));
      border: 1px solid rgba(245, 158, 11, 0.35);
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 35px rgba(245, 158, 11, 0.15);
      border-radius: 24px;
      padding: 44px 36px;
      max-width: 440px;
      width: 100%;
      text-align: center;
      position: relative;
    }
    .brand-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 14px;
      border-radius: 9999px;
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.35);
      color: #fbbf24;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 24px;
    }
    .spinner-wrap {
      position: relative;
      width: 72px;
      height: 72px;
      margin: 0 auto 24px;
    }
    .spinner {
      width: 72px;
      height: 72px;
      border: 4px solid rgba(245, 158, 11, 0.15);
      border-top-color: #f59e0b;
      border-radius: 50%;
      animation: spin 0.9s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .game-title {
      font-size: 22px;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 8px;
      letter-spacing: -0.02em;
    }
    .status-text {
      font-size: 13px;
      color: #94a3b8;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      background: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 10px #10b981;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.85); } }
    .footer-note {
      font-size: 11px;
      color: #71717a;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding-top: 16px;
    }
  </style>
</head>
<body>
  <div class="launch-card">
    <div class="brand-pill">AllInOne API · Live Gateway</div>
    <div class="spinner-wrap">
      <div class="spinner"></div>
    </div>
    <div class="game-title">${(gameTitle || 'VIP Casino Game').replace(/</g, '&lt;')}</div>
    <div class="status-text">
      <span class="pulse-dot"></span>
      <span>Connecting to provider game network...</span>
    </div>
    <div class="footer-note">${(brandTitle || 'Top Tier').replace(/</g, '&lt;')} · Official Direct Play Session</div>
  </div>
</body>
</html>`);
        launchTab.document.close();
      }
    } catch (tabErr) {
      console.warn('[RESERVE TAB NOTICE]', tabErr);
    }

    // 2. Immediately close brand drawer so it never overlaps or covers the game
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

    if (modal) {
      this.isOpen = true;
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';

      this.activeGameTitle = gameTitle || 'VIP Casino Game';
      if (titleEl) titleEl.textContent = this.activeGameTitle;
      if (brandEl) brandEl.textContent = `${brandTitle || 'Top Tier'} · Live Gateway Session`;

      // Show loading in modal
      if (loader) loader.classList.remove('hidden');
      if (iframe) {
        iframe.classList.add('hidden');
        iframe.src = 'about:blank';
      }
      this.startProgress();
    }

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
      if (data && data.success && data.url) {
        targetUrl = data.url;
        this.activeGameUrl = targetUrl;
      } else {
        targetUrl = `/demo-player.html?game=${encodeURIComponent(gameTitle)}&brand=${encodeURIComponent(brandTitle)}`;
        this.activeGameUrl = targetUrl;
      }

      // REDIRECT PRE-RESERVED TAB INSTANTLY!
      if (launchTab && !launchTab.closed) {
        try {
          launchTab.location.href = targetUrl;
        } catch (redirErr) {
          console.warn('[TAB REDIRECT ERROR]', redirErr);
        }
      }

      if (popoutBtn) {
        popoutBtn.classList.remove('hidden');
      }

      // Complete in-page progress smoothly
      this.setProgress(90);
      setTimeout(() => {
        this.setProgress(100);
        setTimeout(() => {
          this.clearProgress();
          if (loader) loader.classList.add('hidden');
          if (iframe) {
            iframe.classList.remove('hidden');
            iframe.src = targetUrl;
          }
        }, 200);
      }, 200);

    } catch (err) {
      console.warn('[LAUNCHER ERROR]', err);
      const fallbackUrl = `/demo-player.html?game=${encodeURIComponent(gameTitle)}&brand=${encodeURIComponent(brandTitle)}`;
      this.activeGameUrl = fallbackUrl;

      if (launchTab && !launchTab.closed) {
        try {
          launchTab.location.href = fallbackUrl;
        } catch (e) {}
      }

      this.setProgress(100);
      if (loader) loader.classList.add('hidden');
      if (iframe) {
        iframe.classList.remove('hidden');
        iframe.src = fallbackUrl;
      }
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
