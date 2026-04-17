// ═══════════════════════════════════════════════════════════
//  NetSim Empire — Technology Tree
// ═══════════════════════════════════════════════════════════

import GameState from './gameState.js';

export const TECH_TREE = {
  // ── TIER 1: Startup ──────────────────────────────────────
  t1: {
    label: 'T1 — Startup',
    nodes: [
      { id: 'basic_pc',      name: 'PC / Workstation',  icon: '🖥️',  cost: 0,     desc: 'Basic endpoint.', prereq: [] },
      { id: 'basic_switch',  name: 'Network Switch',    icon: '🔀',  cost: 0,     desc: 'Layer-2 switching.', prereq: [] },
      { id: 'basic_router',  name: 'Basic Router',      icon: '📡',  cost: 0,     desc: 'IP routing device.', prereq: [] },
      { id: 'basic_server',  name: 'Server',            icon: '🗄️',  cost: 0,     desc: 'Application host.', prereq: [] },
      { id: 'ethernet_cable',name: 'Ethernet (100M)',   icon: '🟠',  cost: 0,     desc: '100Mbps copper.', prereq: [] },
      { id: 'qos_basic',     name: 'Basic QoS',         icon: '📊',  cost: 3000,  desc: 'Prioritize VoIP over bulk transfers.', prereq: ['basic_router'] },
    ],
  },

  // ── TIER 2: SMB ──────────────────────────────────────────
  t2: {
    label: 'T2 — SMB',
    nodes: [
      { id: 'firewall',      name: 'Firewall',          icon: '🛡️',  cost: 5000,  desc: 'Filter malicious traffic. Stops DDoS.', prereq: ['basic_router'] },
      { id: 'wifi_ap',       name: 'WiFi 6 AP',         icon: '📶',  cost: 3000,  desc: 'Wireless access, 600Mbps.', prereq: ['basic_switch'] },
      { id: 'fiber_cable',   name: 'Fiber (10G)',        icon: '🔵',  cost: 8000,  desc: '10Gbps optical fiber.', prereq: ['ethernet_cable'] },
      { id: 'vpn',           name: 'VPN Tunnel',        icon: '🔒',  cost: 4000,  desc: 'Encrypted site-to-site VPN.', prereq: ['firewall'] },
      { id: 'vlan',          name: 'VLAN Support',      icon: '🏷️',  cost: 2000,  desc: 'Segment networks logically.', prereq: ['basic_switch'] },
      { id: 'ids_device',    name: 'IDS/IPS Device',    icon: '🔍',  cost: 6000,  desc: 'Intrusion detection & prevention system.', prereq: ['firewall'] },
    ],
  },

  // ── TIER 3: Enterprise ───────────────────────────────────
  t3: {
    label: 'T3 — Enterprise',
    nodes: [
      { id: 'load_balancer', name: 'Load Balancer',     icon: '⚖️',  cost: 15000, desc: 'Distribute traffic across servers.', prereq: ['basic_server', 'fiber_cable'] },
      { id: 'fiber_10g',     name: '10G Backbone',      icon: '💙',  cost: 20000, desc: 'Upgraded 10G enterprise backbone.', prereq: ['fiber_cable'] },
      { id: 'bgp',           name: 'BGP Routing',       icon: '🌐',  cost: 18000, desc: 'Inter-domain routing protocol.', prereq: ['basic_router', 'qos_basic'] },
      { id: 'sdn_basic',     name: 'SDN Controller',    icon: '🤖',  cost: 25000, desc: 'Software-defined networking automation.', prereq: ['vlan', 'bgp'] },
      { id: 'cdn_node',      name: 'CDN Node',          icon: '🌍',  cost: 22000, desc: 'Edge content delivery node.', prereq: ['load_balancer'] },
      { id: 'auto_heal',     name: 'Auto-Recovery',     icon: '♻️',  cost: 12000, desc: 'Automatically repair downed devices.', prereq: ['ids_device', 'sdn_basic'] },
    ],
  },

  // ── TIER 4: Carrier ──────────────────────────────────────
  t4: {
    label: 'T4 — Carrier',
    nodes: [
      { id: 'fiber_400g',    name: '400G Fiber',        icon: '💎',  cost: 80000, desc: '400Gbps ultra-high-speed links.', prereq: ['fiber_10g'] },
      { id: 'satellite',     name: 'Satellite Link',    icon: '🛰️',  cost: 50000, desc: 'Low-earth orbit satellite backhaul.', prereq: ['bgp'] },
      { id: 'core_router',   name: 'Core Router',       icon: '🔥',  cost: 60000, desc: 'High-performance backbone router.', prereq: ['bgp', 'fiber_10g'] },
      { id: 'ai_sdn',        name: 'AI-Managed SDN',   icon: '🧠',  cost: 100000,desc: 'ML-driven network optimization.', prereq: ['sdn_basic', 'cdn_node'] },
      { id: 'quantum_vpn',   name: 'Quantum VPN',       icon: '⚛️',  cost: 75000, desc: 'Quantum-safe encrypted tunnels.', prereq: ['vpn', 'ai_sdn'] },
      { id: 'anycast',       name: 'Anycast Routing',   icon: '📡',  cost: 45000, desc: 'Route to nearest healthy endpoint.', prereq: ['bgp', 'cdn_node'] },
    ],
  },

  // ── TIER 5: Global ───────────────────────────────────────
  t5: {
    label: 'T5 — Global ISP',
    nodes: [
      { id: 'intercontinental',name: 'Transocean Fiber',icon: '🌊',  cost: 500000,desc: 'Undersea fiber cable spanning continents.', prereq: ['fiber_400g', 'anycast'] },
      { id: 'hyperscaler',   name: 'Hyperscaler Node',  icon: '🏗️',  cost: 200000,desc: 'Massive cloud compute node.', prereq: ['core_router', 'ai_sdn'] },
      { id: 'ai_optimizer',  name: 'Neural Optimizer',  icon: '💡',  cost: 250000,desc: 'AI that detects and mitigates threats in real-time.', prereq: ['ai_sdn', 'quantum_vpn'] },
      { id: 'five_nines_cert',name: '99.999% SLA Cert', icon: '🏆',  cost: 100000,desc: 'Certification for Five Nines uptime infrastructure.', prereq: ['auto_heal', 'anycast'] },
    ],
  },
};

// Flatten for lookup
export const ALL_TECH = Object.values(TECH_TREE).flatMap(tier => tier.nodes);

export class TechTreeManager {
  constructor(ui) {
    this.ui = ui;
    this._autoHealInterval = null;
  }

  canUnlock(techId) {
    const tech = ALL_TECH.find(t => t.id === techId);
    if (!tech) return false;
    if (GameState.unlockedTech.has(techId)) return false;
    if (GameState.money < tech.cost) return false;
    return tech.prereq.every(p => GameState.unlockedTech.has(p));
  }

  unlock(techId) {
    const tech = ALL_TECH.find(t => t.id === techId);
    if (!tech) return false;
    
    if (GameState.unlockedTech.has(techId)) return false;
    
    if (!tech.prereq.every(p => GameState.unlockedTech.has(p))) {
      this.ui.toast('🔒 Locked', 'Prerequisites not met.', 'warn');
      return false;
    }

    if (GameState.money < tech.cost) {
      this.ui.toast('💸 Insufficient Funds', `Research costs $${tech.cost.toLocaleString()}`, 'warn');
      this.ui.logEvent(`Insufficient funds: ${tech.name} costs $${tech.cost.toLocaleString()} (have $${GameState.money.toLocaleString()})`, 'warning');
      return false;
    }

    GameState.spend(tech.cost);
    GameState.unlockedTech.add(techId);
    GameState.gainXP(tech.cost / 20);

    this._updateTier();
    this._applyEffect(techId);

    this.ui.toast(`🔬 Tech Unlocked`, `${tech.icon} ${tech.name}`, 'success');
    this.ui.logEvent(`Research complete: ${tech.name}`, 'success');
    this.ui.refreshTechTree(this);
    this.ui.refreshToolbar();

    return true;
  }

  getTechStatus(techId) {
    if (GameState.unlockedTech.has(techId)) return 'unlocked';
    const tech = ALL_TECH.find(t => t.id === techId);
    if (!tech) return 'locked';
    const prereqsMet = tech.prereq.every(p => GameState.unlockedTech.has(p));
    return prereqsMet ? 'available' : 'locked';
  }

  _updateTier() {
    const t2req = ['firewall', 'wifi_ap', 'fiber_cable'];
    const t3req = ['load_balancer', 'bgp', 'sdn_basic'];
    const t4req = ['fiber_400g', 'ai_sdn'];
    const t5req = ['intercontinental', 'ai_optimizer'];

    if (t5req.every(t => GameState.unlockedTech.has(t)))      GameState.techTier = 5;
    else if (t4req.every(t => GameState.unlockedTech.has(t))) GameState.techTier = 4;
    else if (t3req.every(t => GameState.unlockedTech.has(t))) GameState.techTier = 3;
    else if (t2req.every(t => GameState.unlockedTech.has(t))) GameState.techTier = 2;
    else GameState.techTier = 1;
  }

  _applyEffect(techId) {
    switch (techId) {
      case 'auto_heal':
        this._enableAutoHeal();
        break;
      case 'ai_optimizer':
        GameState.satisfaction = Math.min(100, GameState.satisfaction + 20);
        break;
    }
  }

  _enableAutoHeal() {
    // Prevent stacking intervals on game reset
    if (this._autoHealInterval) clearInterval(this._autoHealInterval);
    this._autoHealInterval = setInterval(() => {
      if (GameState.unlockedTech.has('auto_heal') && GameState.network) {
        for (const node of GameState.network.nodes.values()) {
          if (node.health < node.healthMax) {
            node.repair(5);
          }
        }
      }
    }, 3000);
  }
}

export default TechTreeManager;
