// Interactive Pricing & Custom Provider Builder Module
const Buy = {
  currentPlan: 'trial', // trial, 10years, vip, custom
  selectedProviders: new Set(),
  cartCategory: 'all',
  cartSearch: '',
  keysOption: 'single', // single, separate
  depositNetwork: 'trc20',

  init() {
    this.bindEvents();
    this.renderCustomProviderList();
    this.updateSummary();
  },

  bindEvents() {
    // Plan card selection
    document.querySelectorAll('.plan-select-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.plan-select-card').forEach(c => {
          c.classList.remove('border-amber-500', 'bg-zinc-900/90', 'shadow-amber-500/10');
          c.classList.add('border-white/10', 'bg-zinc-950/70');
        });
        card.classList.add('border-amber-500', 'bg-zinc-900/90', 'shadow-amber-500/10');
        card.classList.remove('border-white/10', 'bg-zinc-950/70');

        this.currentPlan = card.getAttribute('data-plan');
        const customBox = document.getElementById('customProviderPickerBox');

        if (this.currentPlan === 'custom') {
          customBox.classList.remove('opacity-40', 'pointer-events-none');
        } else {
          customBox.classList.add('opacity-40', 'pointer-events-none');
        }

        this.updateSummary();
      });
    });

    // Cart category filter
    document.querySelectorAll('.buy-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.buy-cat-btn').forEach(b => {
          b.classList.remove('bg-amber-500', 'text-black', 'font-bold');
          b.classList.add('bg-zinc-800', 'text-zinc-300');
        });
        btn.classList.add('bg-amber-500', 'text-black', 'font-bold');
        btn.classList.remove('bg-zinc-800', 'text-zinc-300');

        this.cartCategory = btn.getAttribute('data-cat');
        this.renderCustomProviderList();
      });
    });

    // Cart search
    const searchInput = document.getElementById('buyProviderSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.cartSearch = e.target.value.trim().toLowerCase();
        this.renderCustomProviderList();
      });
    }

    // Key options
    document.querySelectorAll('.key-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.key-opt-btn').forEach(b => {
          b.classList.remove('border-amber-500', 'bg-amber-500/10', 'text-amber-300');
          b.classList.add('border-white/10', 'bg-zinc-900', 'text-zinc-400');
        });
        btn.classList.add('border-amber-500', 'bg-amber-500/10', 'text-amber-300');
        btn.classList.remove('border-white/10', 'bg-zinc-900', 'text-zinc-400');
        this.keysOption = btn.getAttribute('data-key');
      });
    });

    // Network options
    document.querySelectorAll('.network-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.network-opt-btn').forEach(b => {
          b.classList.remove('border-amber-500', 'bg-amber-500/10', 'text-amber-300');
          b.classList.add('border-white/10', 'bg-zinc-900', 'text-zinc-400');
        });
        btn.classList.add('border-amber-500', 'bg-amber-500/10', 'text-amber-300');
        btn.classList.remove('border-white/10', 'bg-zinc-900', 'text-zinc-400');
        this.depositNetwork = btn.getAttribute('data-network');
        this.updateDepositDetails();
      });
    });
  },

  renderCustomProviderList() {
    const listEl = document.getElementById('customProvidersList');
    if (!listEl) return;

    const providers = (Catalog.providers || []);
    const filtered = providers.filter(p => {
      let matchCat = true;
      if (this.cartCategory !== 'all') {
        const cat = (p.category || '').toLowerCase();
        matchCat = cat.includes(this.cartCategory);
      }
      const matchSearch = !this.cartSearch || p.brand_title.toLowerCase().includes(this.cartSearch);
      return matchCat && matchSearch;
    });

    listEl.innerHTML = filtered.map(p => {
      const isSelected = this.selectedProviders.has(p.brand_title);
      const price = p.price_usdt || 18;

      return `
        <div onclick="Buy.toggleProvider('${p.brand_title.replace(/'/g, "\\'")}')"
             class="flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition select-none ${
               isSelected 
                 ? 'bg-amber-500/15 border-amber-500/60 text-white' 
                 : 'bg-zinc-900/60 border-white/5 text-zinc-300 hover:border-white/20'
             }">
          <div class="flex items-center space-x-2.5 truncate">
            <div class="w-4 h-4 rounded flex items-center justify-center border ${
              isSelected ? 'bg-amber-500 border-amber-500 text-black' : 'border-zinc-700 bg-zinc-800'
            }">
              ${isSelected ? '<i class="fa-solid fa-check text-[10px]"></i>' : ''}
            </div>
            <span class="text-xs font-semibold truncate">${p.brand_title}</span>
          </div>
          <span class="text-xs font-mono font-bold ${isSelected ? 'text-amber-300' : 'text-zinc-400'}">
            $${price} USDT
          </span>
        </div>
      `;
    }).join('');

    document.getElementById('customSelectedCount').textContent = `${this.selectedProviders.size} selected`;
  },

  toggleProvider(title) {
    if (this.currentPlan !== 'custom') {
      // Auto-switch to custom if clicking providers
      this.selectPlan('custom');
    }

    if (this.selectedProviders.has(title)) {
      this.selectedProviders.delete(title);
    } else {
      this.selectedProviders.add(title);
    }
    this.renderCustomProviderList();
    this.updateSummary();
  },

  selectAllProviders() {
    this.selectPlan('custom');
    (Catalog.providers || []).forEach(p => this.selectedProviders.add(p.brand_title));
    this.renderCustomProviderList();
    this.updateSummary();
  },

  clearAllProviders() {
    this.selectedProviders.clear();
    this.renderCustomProviderList();
    this.updateSummary();
  },

  selectPlan(planKey) {
    this.currentPlan = planKey;
    document.querySelectorAll('.plan-select-card').forEach(c => {
      if (c.getAttribute('data-plan') === planKey) {
        c.classList.add('border-amber-500', 'bg-zinc-900/90', 'shadow-amber-500/10');
        c.classList.remove('border-white/10', 'bg-zinc-950/70');
      } else {
        c.classList.remove('border-amber-500', 'bg-zinc-900/90', 'shadow-amber-500/10');
        c.classList.add('border-white/10', 'bg-zinc-950/70');
      }
    });

    const customBox = document.getElementById('customProviderPickerBox');
    if (planKey === 'custom') {
      customBox.classList.remove('opacity-40', 'pointer-events-none');
    } else {
      customBox.classList.add('opacity-40', 'pointer-events-none');
    }
    this.updateSummary();
  },

  calculateTotal() {
    if (this.currentPlan === 'trial') return 50;
    if (this.currentPlan === '10years') return 800;
    if (this.currentPlan === 'vip') return 1500;

    // Custom Modular Providers
    let sum = 0;
    const providersMap = {};
    (Catalog.providers || []).forEach(p => { providersMap[p.brand_title] = p.price_usdt || 45; });
    this.selectedProviders.forEach(name => {
      sum += (providersMap[name] || 45);
    });
    return sum === 0 ? 50 : sum;
  },

  updateSummary() {
    const total = this.calculateTotal();
    const totalEl = document.getElementById('buyTotalAmount');
    const planDescEl = document.getElementById('buyPlanDescription');

    if (totalEl) totalEl.textContent = `$${total} USDT`;

    let desc = '';
    if (this.currentPlan === 'trial') desc = '3-Day Testing License · All 169 Providers Included · 12 USDT Credit';
    else if (this.currentPlan === '10years') desc = '10-Year Enterprise License · All 169 Providers Included · 100 USDT Credit';
    else if (this.currentPlan === 'vip') desc = 'VIP Unlimited Tier · All 169 Providers · Priority Routing · 900 USDT Credit';
    else desc = `${this.selectedProviders.size} Selected Custom Brands`;

    if (planDescEl) planDescEl.textContent = desc;
  },

  openCheckoutModal() {
    const total = this.calculateTotal();
    if (this.currentPlan === 'custom' && this.selectedProviders.size === 0) {
      alert('Please select at least 1 provider brand or choose a bundle plan.');
      return;
    }

    const modal = document.getElementById('checkoutModal');
    // Ensure form is visible, receipt is hidden
    const formBox = document.getElementById('checkoutFormBox');
    const receiptBox = document.getElementById('checkoutReceiptBox');
    if (formBox) formBox.classList.remove('hidden');
    if (receiptBox) receiptBox.classList.add('hidden');

    document.getElementById('checkoutTotalDisplay').textContent = `${total} USDT`;
    document.getElementById('checkoutPlanSummary').textContent = this.currentPlan.toUpperCase() + ' PLAN';
    this.updateDepositDetails();
    modal.classList.add('active');
  },

  closeCheckoutModal() {
    const modal = document.getElementById('checkoutModal');
    if (modal) modal.classList.remove('active');
  },

  updateDepositDetails() {
    const address = this.depositNetwork === 'trc20' 
      ? 'TXb9Rz8KxYp6Wm4Qv2Ln7Sd1Fe3Hg5Jt8A' 
      : '0x71C5A8c3B6dF10a24E9c90F61517aBE3d528b1E2';

    const netName = this.depositNetwork === 'trc20' ? 'Tron (TRC20)' : 'BNB Smart Chain (BEP20)';
    const depEl = document.getElementById('checkoutDepositAddress');
    const netEl = document.getElementById('checkoutNetworkLabel');
    if (depEl) depEl.textContent = address;
    if (netEl) netEl.textContent = netName;
  },

  copyDepositAddress() {
    const addr = document.getElementById('checkoutDepositAddress').textContent.trim();
    navigator.clipboard.writeText(addr).then(() => {
      App.showToast('USDT Address copied to clipboard!', 'success');
    });
  },

  copyText(id, label = 'Copied') {
    const el = document.getElementById(id);
    if (!el) return;
    navigator.clipboard.writeText(el.textContent.trim()).then(() => {
      App.showToast(`${label} copied to clipboard!`, 'success');
    });
  },

  async submitOrder() {
    const emailInput = document.getElementById('checkoutEmail');
    const email = emailInput ? emailInput.value.trim() : '';
    if (!email || !email.includes('@')) {
      alert('Please enter a valid account email address to receive API keys.');
      return;
    }

    const submitBtn = document.querySelector('#checkoutFormBox button[onclick="Buy.submitOrder()"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Provisioning AllInOne API License...</span>';
    }

    try {
      const payload = {
        plan: this.currentPlan,
        providers: Array.from(this.selectedProviders),
        email: email,
        keysOption: this.keysOption,
        network: this.depositNetwork
      };

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!data.success) {
        alert(data.message || 'Error creating order. Please contact VIP manager.');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fa-brands fa-whatsapp text-sm"></i><span>Confirm Order on WhatsApp</span>';
        }
        return;
      }

      // Show instant license provisioning screen
      this.renderOrderReceipt(data);
      App.showToast('License Created! Connecting to VIP support...', 'success');

      // Also trigger WhatsApp confirmation in background/new tab
      if (data.whatsapp_confirm_link) {
        window.open(data.whatsapp_confirm_link, '_blank');
      }
    } catch (err) {
      console.error('Order error:', err);
      alert('Connection error. Please try again or contact WhatsApp.');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-brands fa-whatsapp text-sm"></i><span>Confirm Order on WhatsApp</span>';
      }
    }
  },

  renderOrderReceipt(order) {
    const formBox = document.getElementById('checkoutFormBox');
    const receiptBox = document.getElementById('checkoutReceiptBox');
    if (formBox) formBox.classList.add('hidden');
    if (!receiptBox) return;

    receiptBox.classList.remove('hidden');
    receiptBox.innerHTML = `
      <div class="text-center pb-4 border-b border-white/10">
        <div class="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2 text-xl border border-emerald-500/40">
          <i class="fa-solid fa-circle-check"></i>
        </div>
        <h3 class="text-lg font-extrabold text-white">AllInOne API License Provisioned</h3>
        <p class="text-xs text-zinc-400 mt-1">Order Ref: <span class="mono font-bold text-amber-400">${order.order_id}</span></p>
      </div>

      <div class="space-y-3 my-4 text-xs">
        <div class="p-3 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-between">
          <div>
            <span class="text-[10px] uppercase font-bold text-zinc-400 block">Operator Agent ID</span>
            <span id="recAgentId" class="mono font-bold text-emerald-400 text-sm">${order.operator_id}</span>
          </div>
          <button onclick="Buy.copyText('recAgentId', 'Agent ID')" class="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1">
            <i class="fa-regular fa-copy"></i> Copy
          </button>
        </div>

        <div class="p-3 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-between">
          <div class="truncate mr-2">
            <span class="text-[10px] uppercase font-bold text-zinc-400 block">API Key (AES Encrypted)</span>
            <span id="recApiKey" class="mono text-zinc-300 truncate block">${order.api_key}</span>
          </div>
          <button onclick="Buy.copyText('recApiKey', 'API Key')" class="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1">
            <i class="fa-regular fa-copy"></i> Copy
          </button>
        </div>

        <div class="p-3 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-between">
          <div class="truncate mr-2">
            <span class="text-[10px] uppercase font-bold text-zinc-400 block">API Secret (32-Byte PKCS7)</span>
            <span id="recApiSecret" class="mono text-zinc-300 truncate block">${order.api_secret}</span>
          </div>
          <button onclick="Buy.copyText('recApiSecret', 'API Secret')" class="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1">
            <i class="fa-regular fa-copy"></i> Copy
          </button>
        </div>

        <!-- Deposit Reminder Card -->
        <div class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
          <div class="flex items-center justify-between mb-1">
            <span class="font-bold uppercase tracking-wider text-[11px]">Send Deposit (${order.deposit_network})</span>
            <span class="font-mono font-extrabold text-white text-base">${order.total_usdt} USDT</span>
          </div>
          <p id="recDepositAddr" class="mono text-[11px] text-white break-all select-all font-semibold my-1.5">${order.deposit_address}</p>
          <div class="flex items-center justify-between pt-1 text-[11px]">
            <span class="text-zinc-400">Wallet Credit included: <strong class="text-white">${order.wallet_credit} USDT</strong></span>
            <button onclick="Buy.copyText('recDepositAddr', 'Address')" class="text-amber-400 hover:text-white font-bold flex items-center gap-1">
              <i class="fa-regular fa-copy"></i> Copy Address
            </button>
          </div>
        </div>
      </div>

      <div class="space-y-2 mt-4">
        <a href="${order.whatsapp_confirm_link}" target="_blank" 
           class="w-full btn-gold py-3 rounded-xl text-xs uppercase tracking-wider font-extrabold flex items-center justify-center space-x-2">
          <i class="fa-brands fa-whatsapp text-sm"></i>
          <span>Send TxID to Admin on WhatsApp</span>
        </a>
        <button onclick="Buy.closeCheckoutModal()" 
                class="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 transition">
          Close Window
        </button>
      </div>
    `;
  }
};
