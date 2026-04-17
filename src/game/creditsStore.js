// ═══════════════════════════════════════════════════════════
//  NetSim Empire — Credits Store & GCash Gateway
//  Developed by: Nexarion × Ollama × AntiGravity
// ═══════════════════════════════════════════════════════════

import GameState from './gameState.js';

export const EXCHANGE_RATE = 100; // 1 credit = $100 in-game money

export class CreditsStore {
  constructor(hud) {
    this.hud = hud;
    this.packs = [
      { id: 'starter',    name: 'Starter Pack',      credits: 500,    price: 49.00,  bonus: null, deviceBonus: null, popular: false },
      { id: 'growth',     name: 'Growth Pack',       credits: 2500,   price: 249.00,  bonus: '+250 credits', deviceBonus: null, popular: false },
      { id: 'enterprise', name: 'Enterprise Pack',   credits: 7500,   price: 499.00,  bonus: '+1,000 credits', deviceBonus: '🎁 +3 Devices (2S, 1FW)', popular: true },
      { id: 'megacorp',   name: 'Mega Corp Pack',    credits: 20000,  price: 999.00, bonus: '+3,500 credits', deviceBonus: '🎁 +8 Premium Devices', popular: false },
      { id: 'global_isp', name: 'Global ISP Pack',   credits: 100000, price: 2499.00, bonus: '+20,000 credits', deviceBonus: '🎁 +18 Elite Devices & CDNs', popular: false },
    ];
    this._loaded = true;
  }

  async loadPrices() {
    // Packs are pre-loaded in constructor
    this._loaded = true;
  }

  async getBalance() {
    try {
      const res = await fetch('/api/credits/balance');
      const data = await res.json();
      if (data.success) {
        GameState.credits = data.credits;
        return data.credits;
      }
    } catch { }
    return GameState.credits || 0;
  }

  async purchase(packId) {
    const pack = this.packs.find(p => p.id === packId);
    if (!pack) return false;

    try {
      const res = await fetch('/api/payment/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack_id: packId, amount_php: pack.price, credits: pack.credits, is_donation: false })
      });
      const data = await res.json();
      if (data.success) {
        if (data.checkout_url) {
          window.open(data.checkout_url, '_blank');
        }
        if (data.new_balance !== undefined) GameState.credits = data.new_balance;

        // Grant bonus devices for premium packs directly to their game grid
        this._grantBonusDevices(packId);

        this.hud.toast('💳 PayMongo Initialized', data.message, 'success');
        this.hud.logEvent(data.message, 'success');
        return true;
      } else {
        this.hud.toast('⚠️ Checkout Failed', data.error, 'danger');
        return false;
      }
    } catch (e) {
      this.hud.toast('⚠️ Payment Gateway Error', 'Could not open PayMongo portal', 'danger');
      return false;
    }
  }

  _grantBonusDevices(packId) {
    const gs = GameState;
    if (!gs || !gs.network) return;

    let devices = [];
    if (packId === 'enterprise') devices = ['Server', 'Server', 'Firewall'];
    else if (packId === 'megacorp') devices = ['Server', 'Server', 'Server', 'Server', 'Firewall', 'Firewall', 'Router', 'Router'];
    else if (packId === 'global_isp') devices = ['Server', 'Server', 'Server', 'Server', 'Server', 'Server', 'Server', 'Server', 'Firewall', 'Firewall', 'Firewall', 'Firewall', 'Router', 'Router', 'Router', 'Router', 'CDN', 'CDN'];
    else return;

    let placedCount = 0;
    let radius = 1;
    let placedIdx = 0;

    // Center spawning around (10, 10) since that's roughly where the initial camera points
    const ox = 10;
    const oy = 10;

    while (placedIdx < devices.length && radius < 30) {
      for (let x = -radius; x <= radius; x++) {
        for (let y = -radius; y <= radius; y++) {
          if (placedIdx >= devices.length) break;
          // Only check the border of the square to make a spiral-like search
          if (Math.abs(x) !== radius && Math.abs(y) !== radius) continue;
          
          if (!gs.network.getNodeAt(ox + x, oy + y)) {
             const type = devices[placedIdx];
             const node = gs.network.addNode(type, ox + x, oy + y);
             if (node && GameState.ipManager) {
                 GameState.ipManager.assignAuto(node, gs.network);
             }
             placedIdx++;
             placedCount++;
          }
        }
      }
      radius++;
    }

    if (placedCount > 0) {
      setTimeout(() => {
        this.hud.toast('🎁 Bonus Hardware Delivered!', `Your ${packId.replace('_', ' ').toUpperCase()} included ${placedCount} devices deployed directly to your grid!`, 'success');
        this.hud.logEvent(`Redeemed ${placedCount} bonus devices from ${packId} pack`, 'success');
      }, 1000);
    }
  }

  async donate(amount_php) {
    try {
      const res = await fetch('/api/payment/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_php: amount_php, is_donation: true })
      });
      const data = await res.json();
      if (data.success) {
        if (data.checkout_url) {
          window.open(data.checkout_url, '_blank');
        }
        this.hud.toast('💙 PayMongo Donation Initiated', data.message, 'success');
        this.hud.logEvent(data.message, 'success');
        return true;
      } else {
        this.hud.toast('⚠️ Payment Failed', data.error, 'danger');
        return false;
      }
    } catch (e) {
      this.hud.toast('⚠️ Payment Error', 'Could not open payment portal.', 'danger');
      return false;
    }
  }

  async spendCredits(amount) {
    try {
      const res = await fetch('/api/credits/spend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amount })
      });
      const data = await res.json();
      if (data.success) {
        GameState.credits = data.new_balance;
        GameState.earn(amount * EXCHANGE_RATE); // Give the ingame money
        this.hud.toast('💰 Credits Converted', data.message, 'success');
        return true;
      } else {
        this.hud.toast('⚠️ Balance Error', data.error, 'warn');
        return false;
      }
    } catch {
      this.hud.toast('⚠️ Error', 'Could not communicate with server', 'danger');
      return false;
    }
  }

  // ── Render the store UI ───────────────────────────────────

  renderModal() {
    const container = document.getElementById('creditsStoreContent');
    if (!container) return;

    if (!this._loaded) {
      container.innerHTML = '<div style="text-align:center;color:var(--muted);padding:40px">Connecting to payment gateway...</div>';
      this.loadPrices().then(() => this.renderModal());
      return;
    }

    const balance = GameState.credits || 0;

    let html = `
      <!-- Balance Card -->
      <div style="display:flex;align-items:center;justify-content:space-between;background:linear-gradient(135deg,rgba(0,245,255,.08),rgba(57,255,20,.06));border:1px solid var(--border);border-radius:10px;padding:16px 20px;margin-bottom:20px;">
        <div>
          <div style="font-size:11px;color:var(--muted);letter-spacing:1px;font-family:var(--font-mono);text-transform:uppercase;">Your Credits Balance</div>
          <div style="font-size:28px;font-weight:800;color:var(--amber);font-family:var(--font-logo);margin-top:4px;">💎 ${balance.toLocaleString()}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:11px;color:var(--muted);font-family:var(--font-mono);">In-Game Value</div>
          <div style="font-size:18px;color:var(--green);font-family:var(--font-mono);font-weight:700;">≈ $${(balance * EXCHANGE_RATE).toLocaleString()}</div>
        </div>
      </div>

      <!-- Convert Section -->
      <div style="margin-bottom:20px;padding:12px 16px;background:rgba(255,255,255,.02);border:1px solid var(--border);border-radius:8px;">
        <div style="font-size:12px;color:var(--muted);margin-bottom:10px;font-family:var(--font-mono);">💱 CONVERT CREDITS → IN-GAME MONEY (1 credit = $${EXCHANGE_RATE})</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn-convert" data-spend="50" ${balance < 50 ? 'disabled style="opacity:.4;cursor:default;background:var(--bg-panel);border:1px solid var(--border);color:var(--muted);border-radius:6px;padding:8px 14px;font-family:var(--font-mono);font-size:12px;"' : 'style="background:rgba(0,245,255,.1);border:1px solid var(--cyan);color:var(--cyan);border-radius:6px;padding:8px 14px;cursor:pointer;font-family:var(--font-mono);font-size:12px;transition:all .2s;"'}>50 → $${(50 * EXCHANGE_RATE).toLocaleString()}</button>
          <button class="btn-convert" data-spend="200" ${balance < 200 ? 'disabled style="opacity:.4;cursor:default;background:var(--bg-panel);border:1px solid var(--border);color:var(--muted);border-radius:6px;padding:8px 14px;font-family:var(--font-mono);font-size:12px;"' : 'style="background:rgba(0,245,255,.1);border:1px solid var(--cyan);color:var(--cyan);border-radius:6px;padding:8px 14px;cursor:pointer;font-family:var(--font-mono);font-size:12px;transition:all .2s;"'}>200 → $${(200 * EXCHANGE_RATE).toLocaleString()}</button>
          <button class="btn-convert" data-spend="1000" ${balance < 1000 ? 'disabled style="opacity:.4;cursor:default;background:var(--bg-panel);border:1px solid var(--border);color:var(--muted);border-radius:6px;padding:8px 14px;font-family:var(--font-mono);font-size:12px;"' : 'style="background:rgba(0,245,255,.1);border:1px solid var(--cyan);color:var(--cyan);border-radius:6px;padding:8px 14px;cursor:pointer;font-family:var(--font-mono);font-size:12px;transition:all .2s;"'}>1000 → $${(1000 * EXCHANGE_RATE).toLocaleString()}</button>
        </div>
      </div>

      <!-- Credit Packs -->
      <div style="font-size:13px;color:var(--cyan);font-family:var(--font-logo);letter-spacing:1px;margin-bottom:12px;">💳 RECHARGE CREDITS (via PayMongo)</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-bottom:20px;">
    `;

    for (const pack of this.packs) {
      html += `
        <div style="display:flex;flex-direction:column;background:${pack.popular ? 'linear-gradient(135deg,rgba(0,245,255,.08),rgba(255,184,0,.06))' : 'rgba(255,255,255,.03)'};border:1px solid ${pack.popular ? 'var(--amber)' : 'var(--border)'};border-radius:10px;padding:14px;position:relative;transition:all .2s;${pack.popular ? 'box-shadow:0 0 20px rgba(255,184,0,.15);' : ''}">
          ${pack.popular ? '<div style="position:absolute;top:-8px;right:12px;background:var(--amber);color:#000;font-size:9px;font-weight:800;padding:2px 8px;border-radius:4px;letter-spacing:.5px;">⭐ BEST PACK</div>' : ''}
          <div style="font-size:14px;font-weight:700;color:var(--white);margin-bottom:4px;">${pack.name}</div>
          <div style="font-family:var(--font-mono);font-size:20px;color:var(--amber);font-weight:800;">${pack.credits.toLocaleString()}</div>
          <div style="font-size:10px;color:var(--muted);font-family:var(--font-mono);margin-bottom:2px;">credits</div>
          ${pack.bonus ? `<div style="font-size:11px;color:var(--green);font-family:var(--font-mono);">${pack.bonus}</div>` : '<div style="height:16px;"></div>'}
          ${pack.deviceBonus ? `<div style="font-size:11px;color:var(--cyan);font-family:var(--font-mono);margin-top:4px;">${pack.deviceBonus}</div>` : ''}
          <div style="font-size:16px;color:var(--white);font-weight:700;margin:8px 0 10px;">₱${pack.price.toFixed(2)}</div>
          <div style="margin-top:auto;">
            <button class="btn-buy" data-pack-id="${pack.id}" style="width:100%;background:linear-gradient(135deg,var(--green),var(--cyan));color:#000;font-weight:700;font-family:var(--font-ui);border:none;border-radius:6px;padding:8px;cursor:pointer;font-size:11px;text-transform:uppercase;letter-spacing:1px;transition:all .2s;">Buy ₱${pack.price.toFixed(2)}</button>
          </div>
        </div>
      `;
    }

    html += `</div>

      <!-- Donation Section -->
      <div style="border-top:1px solid var(--border);padding-top:16px;margin-bottom:8px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <div>
            <div style="font-size:13px;color:var(--green);font-family:var(--font-logo);letter-spacing:1px;">💙 SUPPORT THE DEVS</div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px;">Donations help keep NetSim Empire ad-free and updated.</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn-buy-donate" data-amount="50" style="flex:1;padding:10px;background:rgba(57,255,20,.06);border:1px solid var(--green);color:var(--green);border-radius:6px;cursor:pointer;font-family:var(--font-mono);font-size:12px;font-weight:700;transition:all .2s;">₱50</button>
          <button class="btn-buy-donate" data-amount="250" style="flex:1;padding:10px;background:rgba(57,255,20,.06);border:1px solid var(--green);color:var(--green);border-radius:6px;cursor:pointer;font-family:var(--font-mono);font-size:12px;font-weight:700;transition:all .2s;">₱250</button>
          <button class="btn-buy-donate" data-amount="1000" style="flex:1;padding:10px;background:rgba(57,255,20,.06);border:1px solid var(--green);color:var(--green);border-radius:6px;cursor:pointer;font-family:var(--font-mono);font-size:12px;font-weight:700;transition:all .2s;">₱1,000</button>
        </div>
      </div>

      <!-- Footer -->
      <div style="text-align:center;margin-top:16px;font-size:10px;color:rgba(255,255,255,.25);font-family:var(--font-mono);">
        Payments processed securely via PayMongo API. Credits are non-refundable.<br>
        Developed by Nexarion × Ollama × AntiGravity
      </div>
    `;

    container.innerHTML = html;

    // Attach Donation Handlers
    container.querySelectorAll('.btn-buy-donate').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const amt = parseInt(e.target.dataset.amount);
        e.target.textContent = 'Processing...'; e.target.disabled = true;
        await this.donate(amt);
        this.renderModal();
      });
    });
  }
}

export default CreditsStore;
