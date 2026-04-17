// ═══════════════════════════════════════════════════════════
//  NetSim Empire — HUD / UI Controller
// ═══════════════════════════════════════════════════════════

import GameState from '../game/gameState.js';
import { ALL_CONTRACTS } from '../game/contracts.js';
import { TECH_TREE, ALL_TECH } from '../game/techTree.js';
import { DEVICE_TYPES } from '../entities/Node.js';

export class HUD {
  constructor() {
    this._clockTimer = 0;
    this._logEntries = [];
    this._maxLogs = 60;
    this._toastQueue = [];

    // Tooltip div
    this._tooltip = document.createElement('div');
    this._tooltip.id = 'canvasTooltip';
    document.body.appendChild(this._tooltip);
  }

  // ── Tick Update ──────────────────────────────────────────

  update(dtMs) {
    this._clockTimer += dtMs;
    if (this._clockTimer >= 1000) {
      this._clockTimer -= 1000;
      this._updateClock();
    }
    this._updateStats();
  }

  _updateClock() {
    const t = Math.floor(GameState.totalTime);
    const h = String(Math.floor(t / 3600)).padStart(2, '0');
    const m = String(Math.floor((t % 3600) / 60)).padStart(2, '0');
    const s = String(t % 60).padStart(2, '0');
    document.getElementById('gameClock').textContent = `${h}:${m}:${s}`;
  }

  _updateStats() {
    const gs = GameState;

    // Top HUD
    setText('moneyVal', `$${gs.money.toLocaleString()}`);
    setText('creditsVal', `${gs.credits.toLocaleString()}`);
    setText('uptimeVal', `${gs.uptimePct.toFixed(2)}%`);
    setText('clientsVal', `${gs.clients} Clients`);
    setText('levelVal',   gs.levelLabel);

    // XP bar
    const xpPct = gs.xpNext > 0 ? (gs.xp / gs.xpNext) * 100 : 0;
    setBar('xpFill', xpPct);
    setText('xpText', `${Math.floor(gs.xp)} / ${gs.xpNext} XP`);

    // Contract badge count
    const badge = document.getElementById('contractBadge');
    if (badge) {
      const count = gs.activeContracts.length;
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-flex' : 'none';
    }

    // Color uptime
    const uptimeEl = document.getElementById('uptimeVal');
    if (uptimeEl) {
      uptimeEl.style.color = gs.uptimePct >= 99.9 ? 'var(--green)' : gs.uptimePct >= 95 ? 'var(--amber)' : 'var(--red)';
    }

    // Bottom metrics
    const tp = gs.throughputMbps;
    const tpStr = tp >= 1000 ? `${(tp / 1000).toFixed(2)} Gbps` : `${tp.toFixed(0)} Mbps`;
    setText('metThroughput', tpStr);
    setBar('barThroughput', Math.min(100, tp / 10));

    setText('metLatency', `${gs.latencyMs.toFixed(1)} ms`);
    setBar('barLatency', Math.min(100, 100 - Math.min(99, gs.latencyMs)));

    setText('metPacketLoss', `${gs.packetLossRate.toFixed(2)}%`);
    setBar('barPacketLoss', Math.min(100, gs.packetLossRate * 5));

    setText('metJitter', `${gs.jitterMs.toFixed(1)} ms`);
    setBar('barJitter', Math.min(100, gs.jitterMs * 10));

    setText('metSatisfaction', `${Math.round(gs.satisfaction)}%`);
    setBar('barSatisfaction', gs.satisfaction);

    if (gs.network) {
      setText('metDevices', gs.network.nodes.size);
      setText('metLinks', gs.network.links.size);
    }

    // Footer bar elements
    setText('latVal', `${gs.latencyMs.toFixed(1)} ms`);
    setText('tpVal', tpStr);
    setText('lossVal', `${gs.packetLossRate.toFixed(2)}%`);
    setText('cliVal', gs.clients);
    setText('satVal', `${Math.round(gs.satisfaction)}%`);
  }

  // ── Event Log ────────────────────────────────────────────

  logEvent(message, severity = 'info') {
    const entry = { message, severity, time: new Date().toLocaleTimeString('en-US', { hour12: false }) };
    this._logEntries.unshift(entry);
    if (this._logEntries.length > this._maxLogs) this._logEntries.pop();
    this._renderLog();
  }

  _renderLog() {
    const container = document.getElementById('logEntries');
    if (!container) return;

    const toShow = this._logEntries.slice(0, 20);
    container.innerHTML = toShow.map(e => `
      <div class="log-entry ${e.severity}">
        <div class="log-time">${e.time}</div>
        <div>${e.message}</div>
      </div>
    `).join('');
  }

  // ── Toast Notifications ───────────────────────────────────

  toast(title, message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const el = document.createElement('div');
    el.className = `toast ${type === 'warning' ? 'warn' : type}`;
    el.innerHTML = `<div class="toast-title">${title}</div><div>${message}</div>`;
    container.appendChild(el);

    setTimeout(() => {
      el.style.transition = 'opacity .5s, transform .5s';
      el.style.opacity = '0';
      el.style.transform = 'translateX(80px)';
      setTimeout(() => el.remove(), 500);
    }, 3500);
  }

  // ── Contracts Modal ───────────────────────────────────────

  renderContractsModal(contractsManager) {
    const list = document.getElementById('contractsList');
    if (!list) return;

    const available = contractsManager.getAvailable();
    const active = GameState.activeContracts;
    const completed = GameState.completedContracts;

    let html = '';

    if (active.length) {
      html += `<h3 style="color:var(--amber);margin-bottom:12px;font-family:var(--font-logo)">⚡ Active (${active.length})</h3>`;
      active.forEach(c => {
        const result = c._lastResult || { done: false, reason: 'Evaluating...' };
        const held = contractsManager._timers.get(c.id) || 0;
        const pct = Math.min(100, (held / (c.duration * 1000)) * 100);

        html += `
          <div class="contract-card active">
            <div class="contract-header">
              <div class="contract-name">${c.client} — ${c.name}</div>
              <div class="contract-reward">+$${c.reward.toLocaleString()}</div>
            </div>
            <div class="contract-desc">${c.desc}</div>
            <div class="contract-sla">
              <span class="sla-badge">⏱ ${c.sla.uptime}% uptime</span>
              <span class="sla-badge">📶 ≤${c.sla.latency}ms</span>
              <span class="sla-badge">😊 ${c.sla.satisfaction}% satisfaction</span>
            </div>
            <div style="margin-top:8px;font-size:11px;font-family:var(--font-mono);color:${result.done ? 'var(--green)' : 'var(--muted)'}">
              ${result.done ? '✅' : '⏳'} ${result.reason || ''}
            </div>
            <div style="margin-top:8px">
              <div style="height:4px;background:rgba(255,255,255,.08);border-radius:2px;overflow:hidden">
                <div style="width:${pct}%;height:100%;background:var(--amber);border-radius:2px;transition:width .5s"></div>
              </div>
              <div style="font-size:10px;color:var(--muted);font-family:var(--font-mono);margin-top:3px">
                Hold time: ${(held / 1000).toFixed(0)}s / ${c.duration}s
              </div>
            </div>
          </div>`;
      });
    }

    if (available.length) {
      html += `<h3 style="color:var(--cyan);margin:16px 0 12px;font-family:var(--font-logo)">📋 Available (${available.length})</h3>`;
      available.forEach(c => {
        html += `
          <div class="contract-card">
            <div class="contract-header">
              <div class="contract-name">
                 ${c.client} — ${c.name}
                 <button class="btn-help" onclick="if(window._netSimHUD) window._netSimHUD.showContractHelp('${c.id}')" style="background:none;border:none;color:var(--cyan);cursor:pointer;font-size:16px;margin-left:8px;" title="View Specifications">❓</button>
              </div>
              <div class="contract-reward">+$${c.reward.toLocaleString()}</div>
            </div>
            <div class="contract-desc">${c.desc}</div>
            <div class="contract-sla">
              <span class="sla-badge">⏱ ${c.sla.uptime}% uptime</span>
              <span class="sla-badge">📶 ≤${c.sla.latency}ms</span>
              <span class="sla-badge">😊 ${c.sla.satisfaction}% satisfaction</span>
              <span class="sla-badge" style="border-color:var(--amber);color:var(--amber)">🏅 Level ${c.minLevel}+</span>
            </div>
            <button class="btn-accept" data-contract-id="${c.id}">Accept Contract</button>
          </div>`;
      });
    }

    if (completed.length) {
      html += `<h3 style="color:var(--muted);margin:16px 0 12px;font-family:var(--font-logo)">✅ Completed (${completed.length})</h3>`;
      ALL_CONTRACTS.filter(c => completed.includes(c.id)).forEach(c => {
        html += `<div class="contract-card completed"><div class="contract-name">✅ ${c.name}</div><div class="contract-desc" style="font-family:var(--font-mono)">+$${c.reward.toLocaleString()} earned</div></div>`;
      });
    }

    if (!html) {
      html = `<div style="text-align:center;color:var(--muted);padding:40px;font-family:var(--font-mono)">No contracts available yet.<br>Build your network to unlock higher-tier contracts.</div>`;
    }

    list.innerHTML = html;
  }

  showContractHelp(contractId) {
    const c = ALL_CONTRACTS.find(x => x.id === contractId);
    if (!c) return;

    let el = document.getElementById('contractHelpModal');
    if (!el) {
      el = document.createElement('div');
      el.id = 'contractHelpModal';
      el.className = 'modal-overlay hidden';
      el.style.zIndex = '9999';
      el.innerHTML = `
        <div class="modal-box" style="max-width:500px;">
          <button class="modal-close" style="position:absolute;top:10px;right:10px;background:none;border:none;color:var(--muted);font-size:20px;cursor:pointer;" onclick="document.getElementById('contractHelpModal').classList.add('hidden')">✕</button>
          <div id="contractHelpBody"></div>
        </div>
      `;
      document.body.appendChild(el);
      el.addEventListener('click', e => { if(e.target===el) el.classList.add('hidden'); });
    }

    const body = el.querySelector('#contractHelpBody');
    body.innerHTML = `
      <h2 style="color:var(--cyan); margin-top:0">${c.client}</h2>
      <h3 style="color:white; margin: 4px 0 16px;">${c.name}</h3>
      <p style="color:var(--muted); font-size:14px; line-height:1.5">${c.desc}</p>
      
      <div style="background:var(--bg-card); padding:12px; border-radius:6px; margin-top:16px; font-family:var(--font-mono);">
         <div style="margin-bottom:6px;"><strong style="color:var(--amber)">Minimum Clearance Level:</strong> ${c.minLevel}</div>
         <div style="margin-bottom:6px;"><strong style="color:var(--green)">Contract Payout:</strong> $${c.reward.toLocaleString()} • ${c.xpReward} XP</div>
         <div style="margin-bottom:6px;"><strong style="color:var(--white)">Duration / Hold Time:</strong> ${c.duration} Seconds</div>
      </div>
      
      <div style="background:rgba(255,34,68,0.1); padding:12px; border-radius:6px; margin-top:16px; border-left:3px solid #ff2244;">
         <strong style="color:#ff2244; font-family:var(--font-logo);">SLA Enforcement Specs:</strong><br>
         <ul style="color:var(--muted); font-size:13px; padding-left:20px; margin-top:8px;">
            <li>Uptime Must Exceed: ${c.sla.uptime}%</li>
            <li>Latency Maximum Limit: ${c.sla.latency}ms</li>
         </ul>
      </div>
      
      <div style="margin-top:24px; font-size:12px; color:var(--muted); font-family:var(--font-mono); text-align:center;">
        💡 Tip: Use CLI command <span style="color:var(--cyan);">contract connect ${c.id}</span> to initialize instantly.
      </div>
    `;
    
    el.classList.remove('hidden');
  }

  // ── Tech Tree Modal ───────────────────────────────────────

  renderTechTree(techManager) {
    const container = document.getElementById('techTreeContent');
    if (!container) return;
    this.refreshTechTree(techManager, container);
  }

  refreshTechTree(techManager, container) {
    container = container || document.getElementById('techTreeContent');
    if (!container) return;

    container.innerHTML = Object.entries(TECH_TREE).map(([tierKey, tier]) => `
      <div class="tech-tier">
        <div class="tier-label">${tier.label}</div>
        ${tier.nodes.map(tech => {
      const status = techManager.getTechStatus(tech.id);
      const costStr = tech.cost > 0 ? `$${tech.cost.toLocaleString()}` : 'FREE';
      return `
            <div class="tech-node ${status}" data-tech-id="${tech.id}" title="${tech.desc}\n${tech.prereq.length ? 'Requires: ' + tech.prereq.join(', ') : 'No prereqs'}">
              <div class="tech-node-icon">${tech.icon}</div>
              <div class="tech-node-name">${tech.name}</div>
              <div class="tech-node-cost">${status === 'unlocked' ? '✅ OWNED' : costStr}</div>
            </div>`;
    }).join('')}
      </div>
    `).join('');
  }

  // ── Toolbar ───────────────────────────────────────────────

  refreshToolbar() {
    document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
      const tool = btn.dataset.tool;
      const techMap = {
        'Firewall': 'firewall',
        'WiFiAP': 'wifi_ap',
        'LoadBalancer': 'load_balancer',
        'IDS': 'ids_device',
        'CDN': 'cdn_node',
        'CoreRouter': 'core_router',
        'Hyperscaler': 'hyperscaler',
      };
      if (techMap[tool]) {
        const unlocked = GameState.unlockedTech.has(techMap[tool]);
        btn.classList.toggle('locked', !unlocked);
      }
    });

    document.querySelectorAll('.cable-btn[data-cable]').forEach(btn => {
      const cable = btn.dataset.cable;
      const techMap = {
        'fiber': 'fiber_cable',
        'fiber400': 'fiber_400g',
        'satellite': 'satellite'
      };
      const requiredTech = techMap[cable];
      if (requiredTech) {
        const unlocked = GameState.unlockedTech.has(requiredTech);
        btn.disabled = !unlocked;
        btn.style.opacity = unlocked ? '1' : '0.4';
        const labelText = btn.textContent.replace('🔒', '').trim();
        if (!unlocked && !btn.querySelector('small')) {
          btn.innerHTML = `${labelText} <small style="color:var(--amber)" title="Unlock via Tech Tree">🔒</small>`;
        } else if (unlocked) {
          btn.innerHTML = labelText;
        }
      }
    });
  }

  // ── Mission Banner ────────────────────────────────────────

  updateMissionBanner(contract) {
    const banner = document.getElementById('missionBanner');
    if (!banner) return;
    banner.classList.remove('hidden');

    document.getElementById('amName').textContent = `${contract.client} — ${contract.name}`;
    document.getElementById('amDesc').textContent = contract.desc;
    document.getElementById('amReward').textContent = `+$${contract.reward.toLocaleString()}`;
  }

  clearMissionBanner() {
    const banner = document.getElementById('missionBanner');
    if (banner) banner.classList.add('hidden');
  }

  updateMissionProgress(contracts) {
    const progEl = document.getElementById('missionProgress');
    const timerEl = document.getElementById('missionTimer');
    if (!progEl) return;

    const active = GameState.activeContracts;
    if (!active.length) {
      if (timerEl) timerEl.textContent = '';
      return;
    }

    const c = active[0];
    const result = c._lastResult || { done: false, reason: 'Building...' };
    const held = contracts._timers?.get(c.id) || 0;
    const totalMs = c.duration * 1000;
    const heldSec = (held / 1000).toFixed(0);
    const totalSec = c.duration;
    const pct = Math.min(100, (held / totalMs) * 100);

    progEl.innerHTML = `
      <div class="prog-item">
        <div class="prog-check ${result.done ? 'done' : ''}"></div>
        <div class="prog-label">${result.reason || 'Objective'}</div>
      </div>`;

    if (timerEl) {
      if (result.done) {
        timerEl.innerHTML = `<span style="color:var(--green);">&#9202; Holding: ${heldSec}s / ${totalSec}s</span>
          <div style="background:var(--border);border-radius:3px;height:4px;margin-top:4px;overflow:hidden;">
            <div style="background:var(--green);height:100%;width:${pct}%;border-radius:3px;transition:width .3s;"></div>
          </div>`;
      } else {
        timerEl.innerHTML = `<span style="color:var(--amber);">&#128296; Conditions not met yet (hold resets)</span>`;
      }
    }
  }

  // ── Contract Complete celebration ────────────────────────

  showContractComplete(contract) {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
      background:linear-gradient(135deg,rgba(10,18,35,.98),rgba(20,40,70,.98));
      border:2px solid var(--green);border-radius:16px;padding:32px 48px;
      text-align:center;z-index:999;animation:contractComplete .5s ease;
      box-shadow:0 0 60px rgba(57,255,20,.3);max-width:400px;
    `;
    el.innerHTML = `
      <div style="font-size:52px;margin-bottom:12px">🎉</div>
      <div style="font-family:var(--font-logo);font-size:22px;color:var(--green);margin-bottom:8px">CONTRACT COMPLETE!</div>
      <div style="font-family:var(--font-ui);font-size:16px;color:var(--white);margin-bottom:16px">${contract.name}</div>
      <div style="font-family:var(--font-mono);font-size:24px;color:var(--amber);margin-bottom:8px">+$${contract.reward.toLocaleString()}</div>
      <div style="font-family:var(--font-mono);font-size:13px;color:var(--muted)">+${contract.xpReward} XP</div>
    `;
    document.body.appendChild(el);

    const style = document.createElement('style');
    style.textContent = `@keyframes contractComplete { from { transform:translate(-50%,-50%) scale(0.6); opacity:0; } to { transform:translate(-50%,-50%) scale(1); opacity:1; } }`;
    document.head.appendChild(style);

    setTimeout(() => { el.remove(); style.remove(); }, 3000);
  }

  // ── Tooltip ───────────────────────────────────────────────

  showTooltip(x, y, lines) {
    this._tooltip.style.display = 'block';
    this._tooltip.style.left = `${x + 12}px`;
    this._tooltip.style.top = `${y + 12}px`;
    this._tooltip.innerHTML = lines.map(([k, v]) =>
      `<div><span style="color:var(--muted)">${k}:</span> <span>${v}</span></div>`
    ).join('');
  }

  hideTooltip() {
    this._tooltip.style.display = 'none';
  }

  // ── Inspector ─────────────────────────────────────────────

  showInspector(entity) {
    const insp = document.getElementById('inspectorPanel');
    if (!insp) return;
    insp.classList.remove('hidden');

    const title = document.getElementById('inspTitle');
    if (title) title.textContent = entity.label || entity.type || 'Device';

    const inspId = document.getElementById('inspId');
    if (inspId) inspId.textContent = entity.id || '-';

    const inspStatus = document.getElementById('inspStatus');
    if (inspStatus) inspStatus.textContent = entity.health > 0 ? 'Online' : 'Offline';

    const inspHealth = document.getElementById('inspHealth');
    if (inspHealth) inspHealth.textContent = `${Math.round((entity.health / entity.healthMax) * 100)}%`;

    const bodyData = document.getElementById('inspData');
    if (bodyData) {
      const lines = entity.toInspect?.() || [];
      bodyData.innerHTML = lines.map(([k, v]) =>
        `<div style="display:flex; justify-content:space-between; margin-bottom:4px;">
           <span style="color:var(--muted)">${k}</span>
           <span>${v}</span>
         </div>`
      ).join('');
    }
  }

  hideInspector() {
    const insp = document.getElementById('inspectorPanel');
    if (insp) insp.classList.add('hidden');
  }
}

// ── Helpers ───────────────────────────────────────────────

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setBar(id, pct) {
  const el = document.getElementById(id);
  if (el) el.style.width = `${Math.min(100, Math.max(0, pct))}%`;
}

export default HUD;
