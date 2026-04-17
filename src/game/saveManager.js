// ═══════════════════════════════════════════════════════════
//  NetSim Empire — Auto-Save Manager
//  Developed by: N3xari0n × arrikusuz × Repzyu5
// ═══════════════════════════════════════════════════════════

import GameState from './gameState.js';

export class SaveManager {
  constructor(network, ipManager) {
    this.network = network;
    this.ipManager = ipManager;
    this.interval = null;
    this.lastSave = null;
    this.saving = false;
    this.saveCount = 0;
  }

  // ── Start auto-save (every 5 seconds) ─────────────────────

  startAutoSave() {
    if (this.interval) return;
    this.interval = setInterval(() => this.save(), 5000);
    console.log('[SaveManager] Auto-save started (every 5s)');
  }

  stopAutoSave() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  // ── Save to server ────────────────────────────────────────

  async save() {
    if (this.saving || GameState.paused) return;

    // Don't save empty state over a potentially valid save
    if (this.network.nodes.size === 0 && this.saveCount === 0) return;

    if (!GameState.currentUser) {
      this._saveLocal();
      return;
    }

    this.saving = true;
    this._showSaveIndicator();

    // Always save to localStorage first as reliable fallback
    this._saveLocal();

    const payload = {
      state_json: JSON.stringify(this.serialize()),
      slot_id: 1,
    };

    try {
      const res = await fetch('/api/saves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'same-origin',
      });
      const data = await res.json();
      if (data.success) {
        this.lastSave = new Date();
        this.saveCount++;
      }
    } catch (e) {
      // localStorage fallback already saved above
    }

    this.saving = false;
    this._hideSaveIndicator();
  }

  // ── Load from server ──────────────────────────────────────

  async load() {
    if (!GameState.currentUser) return this._loadLocal();

    try {
      const res = await fetch(`/api/saves/1`, {
        credentials: 'same-origin',
      });
      const data = await res.json();
      if (data.success && data.state_json) {
        let parsed;
        try {
          parsed = typeof data.state_json === 'string' ? JSON.parse(data.state_json) : data.state_json;
        } catch (e) {
          console.warn('[SaveManager] JSON parse failed on server data', e);
        }
        if (parsed && this.deserialize(parsed)) {
          return true;
        }
      }
    } catch (e) {
      console.warn('[SaveManager] Server load failed, trying local', e);
      return this._loadLocal();
    }
    return false;
  }

  // ── Serialize all game state ──────────────────────────────

  serialize() {
    const gs = GameState;
    const nodes = [];
    const links = [];

    for (const node of this.network.nodes.values()) {
      nodes.push({
        id: node.id, type: node.type,
        gridX: node.gridX, gridY: node.gridY,
        health: node.health, online: node.online,
      });
    }

    for (const link of this.network.links.values()) {
      links.push({
        id: link.id, fromId: link.from.id, toId: link.to.id,
        cableType: link.cableType, health: link.health, online: link.online,
      });
    }

    return {
      version: '1.1',
      timestamp: Date.now(),
      state: {
        money: gs.money,
        level: gs.level,
        xp: gs.xp,
        xpNext: gs.xpNext,
        totalTime: gs.totalTime,
        downtime: gs.downtime,
        clients: gs.clients,
        satisfaction: gs.satisfaction,
        techTier: gs.techTier,
        credits: gs.credits || 0,
        mode: gs.mode,
        unlockedTech: [...gs.unlockedTech],
        completedContracts: gs.completedContracts,
      },
      network: { nodes, links },
      ipManager: this.ipManager.toJSON(),
    };
  }

  // ── Deserialize ───────────────────────────────────────────

  deserialize(data) {
    if (!data || data.version !== '1.1') {
      // Also accept older saves for migration
      if (data && data.version === '2.0') {
        // Allow migration from old format
      } else {
        return false;
      }
    }
    const gs = GameState;
    const s = data.state;

    // Restore state
    gs.money = s.money ?? 5000;
    gs.level = s.level || 1;
    gs.xp = s.xp || 0;
    gs.xpNext = s.xpNext || 500;
    gs.totalTime = s.totalTime || 0;
    gs.downtime = s.downtime || 0;
    gs.clients = s.clients || 0;
    gs.satisfaction = s.satisfaction || 100;
    gs.techTier = s.techTier || 1;
    gs.credits = s.credits || 0;
    gs.mode = s.mode || 'campaign';
    gs.unlockedTech = new Set(s.unlockedTech || []);
    gs.completedContracts = s.completedContracts || [];

    // Rebuild network
    // Clear existing
    for (const id of [...this.network.nodes.keys()]) {
      this.network.removeNode(id);
    }

    // Add nodes
    for (const nd of data.network.nodes) {
      const node = this.network.addNode(nd.type, nd.gridX, nd.gridY);
      // The addNode generates a new ID; we need to remap
      // For simplicity, just place with new IDs
      node.health = nd.health;
      node.online = nd.online;
    }

    // Add links (by index mapping since IDs regenerate)
    const nodeArr = [...this.network.nodes.values()];
    for (const lk of data.network.links) {
      // Find nodes by original position
      const fromOriginal = data.network.nodes.find(n => n.id === lk.fromId);
      const toOriginal = data.network.nodes.find(n => n.id === lk.toId);
      if (fromOriginal && toOriginal) {
        const fromNode = nodeArr.find(n => n.gridX === fromOriginal.gridX && n.gridY === fromOriginal.gridY);
        const toNode = nodeArr.find(n => n.gridX === toOriginal.gridX && n.gridY === toOriginal.gridY);
        if (fromNode && toNode) {
          const link = this.network.addLink(fromNode.id, toNode.id, lk.cableType);
          if (link) {
            link.health = lk.health;
            link.online = lk.online;
          }
        }
      }
    }

    // Restore IP assignments
    if (data.ipManager) {
      this.ipManager.fromJSON(data.ipManager);
    }

    // Re-assign IPs to new node IDs
    for (const node of this.network.nodes.values()) {
      this.ipManager.assignAuto(node, this.network);
    }

    // Active contracts are intentionally NOT restored.
    // If a user exits mid-contract, it resets and must be re-accepted.
    gs.activeContracts = [];

    return true;
  }

  // ── LocalStorage fallback ─────────────────────────────────

  _saveLocal() {
    try {
      const data = this.serialize();
      localStorage.setItem('netsim_save_' + GameState.mode, JSON.stringify(data));
      this.lastSave = new Date();
      this.saveCount++;
    } catch (e) {
      console.warn('[SaveManager] localStorage save failed', e);
    }
  }

  _loadLocal() {
    try {
      const raw = localStorage.getItem('netsim_save_' + GameState.mode);
      if (raw) {
        const data = JSON.parse(raw);
        return this.deserialize(data);
      }
    } catch (e) {
      console.warn('[SaveManager] localStorage load failed', e);
    }
    return false;
  }

  // ── Save indicator UI ─────────────────────────────────────

  _showSaveIndicator() {
    let el = document.getElementById('saveIndicator');
    if (!el) {
      el = document.createElement('div');
      el.id = 'saveIndicator';
      el.style.cssText = `
        position:fixed; bottom:68px; left:140px; z-index:50;
        font-family:'Share Tech Mono',monospace; font-size:11px;
        color:var(--green); opacity:0; transition:opacity .3s;
      `;
      document.body.appendChild(el);
    }
    el.textContent = '💾 Saving...';
    el.style.opacity = '1';
  }

  _hideSaveIndicator() {
    const el = document.getElementById('saveIndicator');
    if (el) {
      el.textContent = `💾 Saved (${this.saveCount})`;
      setTimeout(() => { el.style.opacity = '0'; }, 1500);
    }
  }
}

export default SaveManager;
