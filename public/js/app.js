// Main Application Controller
const App = {
  isAgentVerified: false,

  init() {
    this.checkStoredAgentCode();
    this.bindGlobalEvents();
    this.animateCounters();

    // Init modules
    Catalog.init();
    Documentation.init();
    Buy.init();
  },

  checkStoredAgentCode() {
    const saved = localStorage.getItem('igaming_agent_verified');
    if (saved === 'true') {
      this.isAgentVerified = true;
      this.renderVerifiedBadge();
    }
  },

  bindGlobalEvents() {
    // Agent gate verification form
    const gateForm = document.getElementById('agentGateForm');
    if (gateForm) {
      gateForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.verifyAgentCode();
      });
    }

    // Contact form submit
    const contactForm = document.getElementById('enterpriseContactForm');
    if (contactForm) {
      contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('contactName').value;
        const msg = document.getElementById('contactMsg').value;
        const waUrl = `https://wa.me/918052354357?text=${encodeURIComponent(`Hello, I am ${name}. ${msg}`)}`;
        window.open(waUrl, '_blank');
        this.showToast('Inquiry sent! Connecting to VIP manager...', 'success');
        contactForm.reset();
      });
    }

    // Close modals on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        Launcher.close();
        Catalog.closeBrandDrawer();
        Buy.closeCheckoutModal();
        this.closeAgentModal();
      }
    });
  },

  openAgentModal() {
    const modal = document.getElementById('agentGateModal');
    if (modal) modal.classList.add('active');
  },

  closeAgentModal() {
    const modal = document.getElementById('agentGateModal');
    if (modal) modal.classList.remove('active');
  },

  async verifyAgentCode() {
    const input = document.getElementById('agentCodeInput');
    const msgEl = document.getElementById('agentGateMsg');
    const code = (input ? input.value : '').trim();

    if (!code) {
      if (msgEl) msgEl.textContent = 'Please enter your agent code.';
      return;
    }

    if (msgEl) msgEl.textContent = 'Verifying with AllInOne API gateway...';

    try {
      const res = await fetch('/api/verify-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await res.json();

      if (data.success) {
        this.isAgentVerified = true;
        localStorage.setItem('igaming_agent_verified', 'true');
        localStorage.setItem('igaming_agent_code', code);
        this.renderVerifiedBadge();
        this.closeAgentModal();
        this.showToast('VIP Access Unlocked! Agent code active.', 'success');
      } else {
        if (msgEl) msgEl.textContent = data.message || 'Invalid agent code.';
      }
    } catch (e) {
      if (msgEl) msgEl.textContent = 'Connection error. Please try again.';
    }
  },

  renderVerifiedBadge() {
    const headerBtn = document.getElementById('agentHeaderBtn');
    if (headerBtn) {
      headerBtn.innerHTML = `
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span class="text-emerald-400 font-extrabold text-xs">VIP AGENT ACTIVE</span>
      `;
      headerBtn.classList.add('border-emerald-500/30', 'bg-emerald-500/10');
      headerBtn.classList.remove('border-amber-500/30', 'bg-amber-500/10');
    }
  },

  showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toastMsg');
    if (!toast || !msgEl) return;

    msgEl.textContent = message;
    toast.classList.remove('translate-y-24', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');

    setTimeout(() => {
      toast.classList.add('translate-y-24', 'opacity-0');
      toast.classList.remove('translate-y-0', 'opacity-100');
    }, 3200);
  },

  animateCounters() {
    const counters = document.querySelectorAll('.counter-val');
    counters.forEach(c => {
      const target = parseFloat(c.getAttribute('data-target'));
      const prefix = c.getAttribute('data-prefix') || '';
      const suffix = c.getAttribute('data-suffix') || '';
      let current = 0;
      const step = target / 40;

      const timer = setInterval(() => {
        current += step;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        c.textContent = `${prefix}${target % 1 === 0 ? Math.round(current) : current.toFixed(1)}${suffix}`;
      }, 35);
    });
  },

  scrollTestimonials(direction) {
    const container = document.getElementById('testimonialsContainer');
    if (!container) return;
    const scrollAmount = 370 * direction;
    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
