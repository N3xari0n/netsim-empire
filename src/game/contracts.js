// ═══════════════════════════════════════════════════════════
//  NetSim Empire — Contracts & Missions System v1.0
//  Developed by: N3xari0n × Ollama × AntiGravity
// ═══════════════════════════════════════════════════════════

import GameState from './gameState.js';

export const ALL_CONTRACTS = [
  // ─── DIFFICULTY 1 (Levels 1-2) ───
  {
    id: 'c01', minLevel: 1,
    client: '🏢 Acme Corp',
    name: 'Basic Office Network',
    desc: 'Connect at least 3 PCs through a router. Simple but essential.',
    reward: 2500, xpReward: 150,
    sla: { uptime: 95, latency: 50, satisfaction: 70 },
    duration: 120, // 2 mins
    check(network, gs) {
      const pcs = network.getNodesByType('PC');
      const routers = network.getNodesByType('Router');
      if (pcs.length < 3 || routers.length < 1) return { done: false, reason: 'Need 3+ PCs and 1 Router' };
      let connected = 0;
      for (const pc of pcs) {
        if (network.findPath(pc.id, routers[0].id)) connected++;
      }
      return { done: connected >= 3, reason: `${connected}/3 PCs connected` };
    },
  },
  {
    id: 'c02', minLevel: 1,
    client: '🛒 ShopNet',
    name: 'E-Commerce Server Setup',
    desc: 'Deploy a server reachable by 5 PCs with latency under 20ms.',
    reward: 7000, xpReward: 300,
    sla: { uptime: 97, latency: 20, satisfaction: 75 },
    duration: 180, // 3 mins
    check(network, gs) {
      const servers = network.getNodesByType('Server');
      const pcs = network.getNodesByType('PC');
      if (!servers.length || pcs.length < 5) return { done: false, reason: `Need 5 PCs + 1 Server (have ${pcs.length} PCs)` };
      let reachable = 0;
      for (const pc of pcs) {
        if (network.findPath(pc.id, servers[0].id)) reachable++;
      }
      const latOk = gs.latencyMs <= 20 || gs.latencyMs === 0;
      return { done: reachable >= 5 && latOk, reason: `${reachable}/5 PCs reach server, latency: ${gs.latencyMs.toFixed(1)}ms` };
    },
  },

  // ─── DIFFICULTY 2 (Levels 3-4) ───
  {
    id: 'c03', minLevel: 3,
    client: '🏗️ BranchBuilders',
    name: 'Branch Office VPN',
    desc: 'Deploy 2 routers connected through a switch for future site-to-site.',
    reward: 9000, xpReward: 400,
    sla: { uptime: 98, latency: 30, satisfaction: 80 },
    duration: 180,
    check(network, gs) {
      const routers = network.getNodesByType('Router');
      const switches = network.getNodesByType('Switch');
      if (routers.length < 2 || switches.length < 1) return { done: false, reason: 'Need 2 Routers and 1 Switch' };
      const r1 = routers[0]; const r2 = routers[1]; const sw = switches[0];
      const r1Connected = network.findPath(r1.id, sw.id) != null;
      const r2Connected = network.findPath(r2.id, sw.id) != null;
      return { done: r1Connected && r2Connected, reason: 'Routers connected to core switch' };
    },
  },
  {
    id: 'c04', minLevel: 3,
    client: '🛡️ SecureBank',
    name: 'Banking Firewall',
    desc: 'Install a Firewall protecting your servers. Zero ransomware allowed.',
    reward: 15000, xpReward: 600,
    sla: { uptime: 99, latency: 25, satisfaction: 85 },
    duration: 240,
    check(network, gs) {
      const firewalls = network.getNodesByType('Firewall');
      const servers = network.getNodesByType('Server');
      if (!firewalls.length) return { done: false, reason: 'No Firewall deployed' };
      if (!servers.length) return { done: false, reason: 'No Servers deployed' };
      let protected_ = false;
      for (const fw of firewalls) {
        for (const link of fw.links) {
          const other = link.from.id === fw.id ? link.to : link.from;
          if (other.type === 'Server' || other.type === 'Router') { protected_ = true; break; }
        }
        if (protected_) break;
      }
      return { done: protected_ && gs.packetLossRate < 5, reason: protected_ ? 'Firewall protecting servers ✓' : 'Firewall not in path' };
    },
  },
  {
    id: 'c05', minLevel: 4,
    client: '📺 StreamFlix',
    name: '4K Streaming Network',
    desc: 'Serve video to 8 clients. Need high bandwidth — use Fiber!',
    reward: 35000, xpReward: 1000,
    sla: { uptime: 98, latency: 15, satisfaction: 80 },
    duration: 300,
    check(network, gs) {
      const servers = network.getNodesByType('Server');
      const pcs = network.getNodesByType('PC');
      const fiberLinks = [...network.links.values()].filter(l => l.cableType === 'fiber');
      if (!servers.length || pcs.length < 8) return { done: false, reason: `Need 8 PCs (have ${pcs.length})` };
      if (!fiberLinks.length) return { done: false, reason: 'No Fiber cables installed' };
      const throughputOk = gs.throughputMbps >= 100;
      return { done: pcs.length >= 8 && fiberLinks.length >= 1 && throughputOk, reason: `${gs.throughputMbps.toFixed(0)} Mbps throughput` };
    },
  },

  // ─── DIFFICULTY 3 (Levels 5-6) ───
  {
    id: 'c06', minLevel: 5,
    client: '🌆 Smart City Authority',
    name: 'City WiFi Rollout',
    desc: 'Deploy 4 WiFi APs covering 500+ virtual users. Mesh topology required.',
    reward: 50000, xpReward: 1500,
    sla: { uptime: 99.5, latency: 10, satisfaction: 90 },
    duration: 360,
    check(network, gs) {
      const aps = network.getNodesByType('WiFiAP');
      if (aps.length < 4) return { done: false, reason: `${aps.length}/4 WiFi APs deployed` };
      const clients = gs.clients;
      return { done: aps.length >= 4 && clients >= 10, reason: `${aps.length} APs, ${clients} clients` };
    },
  },
  {
    id: 'c07', minLevel: 5,
    client: '⚖️ CloudBalance Inc.',
    name: 'Load-Balanced Web Farm',
    desc: 'Deploy a Load Balancer fronting 3 servers. Achieve 99% uptime.',
    reward: 60000, xpReward: 1800,
    sla: { uptime: 99, latency: 8, satisfaction: 88 },
    duration: 300,
    check(network, gs) {
      const lbs = network.getNodesByType('LoadBalancer');
      const servers = network.getNodesByType('Server');
      if (!lbs.length) return { done: false, reason: 'No Load Balancer deployed' };
      if (servers.length < 3) return { done: false, reason: `Need 3 Servers (have ${servers.length})` };
      const uptimeOk = gs.uptimePct >= 99;
      return { done: servers.length >= 3 && lbs.length >= 1 && uptimeOk, reason: `Uptime: ${gs.uptimePct.toFixed(2)}%` };
    },
  },
  {
    id: 'c08', minLevel: 6,
    client: '🏥 Medinet',
    name: 'Hospital Network Reliability',
    desc: 'Achieve 99.9% uptime. Place redundant routers for failover.',
    reward: 75000, xpReward: 2000,
    sla: { uptime: 99.9, latency: 10, satisfaction: 95 },
    duration: 400,
    check(network, gs) {
      const routers = network.getNodesByType('Router');
      if (routers.length < 3) return { done: false, reason: 'Need 3+ routers for redundancy' };
      return { done: gs.uptimePct >= 99.9, reason: `Uptime: ${gs.uptimePct.toFixed(2)}%` };
    },
  },
  {
    id: 'c09', minLevel: 6,
    client: '🛡️ CyberGuard',
    name: 'DDoS Survival Test',
    desc: 'Keep latency under 15ms while surviving consistent attacks.',
    reward: 90000, xpReward: 2500,
    sla: { uptime: 99, latency: 15, satisfaction: 90 },
    duration: 300,
    check(network, gs) {
      const latOk = gs.latencyMs <= 15;
      return { done: latOk && gs.uptimePct >= 99, reason: `Latency: ${gs.latencyMs.toFixed(1)}ms` };
    },
  },

  // ─── DIFFICULTY 4 (Levels 7-8) ───
  {
    id: 'c10', minLevel: 7,
    client: '🎓 UniNet',
    name: 'Data Center Ring',
    desc: 'Build a 4-switch redundant ring topology. Maintain 0 packet loss.',
    reward: 120000, xpReward: 3500,
    sla: { uptime: 99.9, latency: 5, satisfaction: 95 },
    duration: 450,
    check(network, gs) {
      const sw = network.getNodesByType('Switch');
      if (sw.length < 4) return { done: false, reason: `${sw.length}/4 Switches` };
      // Simplified ring check: average links per switch >= 2
      let totalSwLinks = 0;
      for (const s of sw) totalSwLinks += s.links.length;
      if (totalSwLinks / sw.length < 2) return { done: false, reason: 'Switches not in ring topology' };
      return { done: gs.packetLossRate === 0, reason: `Loss: ${gs.packetLossRate.toFixed(1)}%` };
    },
  },
  {
    id: 'c11', minLevel: 7,
    client: '📞 VoiceCorp',
    name: 'QoS Priority Tuning',
    desc: 'Ensure VoIP traffic is prioritized over FTP. Jitter must be < 2ms.',
    reward: 150000, xpReward: 4000,
    sla: { uptime: 99.9, latency: 5, satisfaction: 98 },
    duration: 360,
    check(network, gs) {
      const jitterOk = gs.jitterMs <= 2.0;
      return { done: jitterOk, reason: `Jitter: ${gs.jitterMs.toFixed(1)}ms` };
    },
  },
  {
    id: 'c12', minLevel: 8,
    client: '🌐 GlobalNet ISP',
    name: 'ISP Core Build',
    desc: 'Build a core with 400G links and at least 2 CDN nodes.',
    reward: 250000, xpReward: 5000,
    sla: { uptime: 99.99, latency: 2, satisfaction: 95 },
    duration: 600,
    check(network, gs) {
      const cdns = network.getNodesByType('CDN');
      const g400 = [...network.links.values()].filter(l => l.cableType === 'fiber400');
      if (cdns.length < 2) return { done: false, reason: `${cdns.length}/2 CDN nodes deployed` };
      if (g400.length < 3) return { done: false, reason: `${g400.length}/3 × 400G links needed` };
      return { done: gs.uptimePct >= 99.9 && gs.latencyMs <= 2, reason: `Uptime ${gs.uptimePct.toFixed(3)}%, ${gs.latencyMs.toFixed(1)}ms` };
    },
  },
  {
    id: 'c13', minLevel: 8,
    client: '🌍 BGP Interconnect',
    name: 'BGP Peering Alliance',
    desc: 'Deploy 5 Routers forming an edge network. Sustain 500+ Mbps.',
    reward: 300000, xpReward: 6000,
    sla: { uptime: 99.99, latency: 4, satisfaction: 96 },
    duration: 500,
    check(network, gs) {
      const r = network.getNodesByType('Router');
      if (r.length < 5) return { done: false, reason: `${r.length}/5 Routers deployed` };
      return { done: gs.throughputMbps >= 500, reason: `Throughput: ${gs.throughputMbps.toFixed(0)} Mbps` };
    },
  },

  // ─── DIFFICULTY 5 (Levels 9-10) ───
  {
    id: 'c14', minLevel: 9,
    client: '🚀 OmniEdge',
    name: 'Global CDN Dominance',
    desc: 'Deploy 4 CDNs and 2 Satellite Links to cover remote areas.',
    reward: 450000, xpReward: 8000,
    sla: { uptime: 99.99, latency: 3, satisfaction: 99 },
    duration: 600,
    check(network, gs) {
      const cdns = network.getNodesByType('CDN');
      const gSat = [...network.links.values()].filter(l => l.cableType === 'satellite');
      if (cdns.length < 4) return { done: false, reason: `${cdns.length}/4 CDN nodes` };
      if (gSat.length < 2) return { done: false, reason: `${gSat.length}/2 Satellite links deployed` };
      return { done: true, reason: 'Infrastructure deployed' };
    },
  },
  {
    id: 'c15', minLevel: 9,
    client: '🔒 NSA',
    name: 'Zero Trust Security',
    desc: 'Deploy at least 4 Firewalls. Jitter must be near 0 under attack.',
    reward: 600000, xpReward: 10000,
    sla: { uptime: 99.99, latency: 2, satisfaction: 99 },
    duration: 600,
    check(network, gs) {
      const fw = network.getNodesByType('Firewall');
      if (fw.length < 4) return { done: false, reason: `${fw.length}/4 Firewalls` };
      return { done: gs.jitterMs <= 1.0, reason: `Jitter: ${gs.jitterMs.toFixed(1)}ms` };
    },
  },
  {
    id: 'c16', minLevel: 10,
    client: '🏦 MegaBank Global',
    name: 'Five Nines Reliability Challenge',
    desc: 'Achieve 99.999% uptime for 5 minutes. No mistakes allowed.',
    reward: 1000000, xpReward: 15000,
    sla: { uptime: 99.999, latency: 1, satisfaction: 100 },
    duration: 300,
    check(network, gs) {
      const fiveNines = gs.uptimePct >= 99.999;
      const lowLat = gs.latencyMs <= 1.5 || gs.latencyMs === 0;
      return { done: fiveNines && lowLat, reason: `Uptime: ${gs.uptimePct.toFixed(5)}%, Lat: ${gs.latencyMs.toFixed(1)}ms` };
    },
  },
  {
    id: 'c17', minLevel: 10,
    client: '🌎 The Planet',
    name: 'Global Infrastructure Domination',
    desc: 'Reach 10,000+ virtual clients and sustain 1+ Gbps throughput.',
    reward: 2500000, xpReward: 30000,
    sla: { uptime: 99.99, latency: 1, satisfaction: 100 },
    duration: 600,
    check(network, gs) {
      if (gs.clients < 10000) return { done: false, reason: `${gs.clients}/10,000 Clients` };
      return { done: gs.throughputMbps >= 1000, reason: `${gs.throughputMbps.toFixed(0)}/1000 Mbps` };
    },
  },
  {
    id: 'c18', minLevel: 3,
    client: '💻 DevSquad',
    name: 'CLI Subnet Mastery',
    desc: 'Assign IPs via CLI to 3 Devices using the `config ip` command.',
    reward: 18000, xpReward: 800,
    sla: { uptime: 95, latency: 50, satisfaction: 80 },
    duration: 120,
    check(network, gs) {
      const assignments = gs._cliAssignmentsCount || 0; // tracked in CLI
      return { done: assignments >= 3, reason: `${assignments}/3 CLI IP assignments made` };
    },
  },
  {
    id: 'c19', minLevel: 4,
    client: '🗺️ MapMakers',
    name: 'Traceroute Explorer',
    desc: 'Successfully reach 5 hops on a single path using traceroute in CLI.',
    reward: 22000, xpReward: 1000,
    sla: { uptime: 95, latency: 50, satisfaction: 80 },
    duration: 120,
    check(network, gs) {
      const maxHops = gs._maxTracerouteHops || 0; // tracked in CLI
      return { done: maxHops >= 5, reason: `Max traceroute hops: ${maxHops}/5` };
    },
  },
  {
    id: 'c20', minLevel: 5,
    client: '🚀 Orbit Communications',
    name: 'Satellite Backhaul Trial',
    desc: 'Deploy a Satellite Link to bypass a broken terrestrial path.',
    reward: 65000, xpReward: 2500,
    sla: { uptime: 99, latency: 25, satisfaction: 90 },
    duration: 240,
    check(network, gs) {
      const gSat = [...network.links.values()].filter(l => l.cableType === 'satellite');
      return { done: gSat.length >= 1, reason: `${gSat.length} Satellite links active` };
    },
  }
];

export class ContractsManager {
  constructor(ui) {
    this.ui = ui;
    this._timers = new Map();   // contractId → elapsed hold time (ms)
  }

  // Return contracts available for current level
  getAvailable() {
    return ALL_CONTRACTS.filter(c =>
      c.minLevel <= Math.max(1, GameState.level) &&
      !GameState.completedContracts.includes(c.id) &&
      !GameState.activeContracts.find(ac => ac.id === c.id)
    ).sort((a, b) => a.minLevel - b.minLevel);
  }

  accept(contractId, network) {
    if (GameState.activeSite !== 'home') {
      this.ui.toast('⚠️ Cannot Accept', 'You must return to the Home Lab to accept a new contract.', 'red');
      return false;
    }

    // ENFORCE SINGLE CONTRACT
    if (GameState.activeContracts.length >= 1) {
      this.ui.toast('⚠️ Multiple Contracts Used', 'You can only have one active contract at a time to focus properly.', 'warn');
      return false;
    }

    const contract = ALL_CONTRACTS.find(c => c.id === contractId);
    if (!contract) return false;
    if (GameState.activeContracts.find(c => c.id === contractId)) return false;

    if (window._netSimTeleportToClient && window._netSimTeleportToClient(contractId)) {
      GameState.activeContracts.push({ ...contract, acceptedAt: Date.now(), holdTime: 0 });
      this._timers.set(contractId, 0);
      this.ui.logEvent(`Contract accepted: "${contract.name}"`, 'info');
      this.ui.toast('📋 Contract Accepted', contract.name, 'info');
      this.ui.updateMissionBanner(contract);
      return true;
    }
    return false;
  }

  update(dtMs, network) {
    if (GameState.paused) return;

    for (const contract of [...GameState.activeContracts]) {
      const result = contract.check(network, GameState);

      if (result.done) {
        const held = (this._timers.get(contract.id) || 0) + dtMs;
        this._timers.set(contract.id, held);

        if (held >= contract.duration * 1000) {
          this._complete(contract);
        }
      } else {
        // Pauses hold timer on failure instead of resetting it
        // this._timers.set(contract.id, 0);
      }

      // Update mission progress display
      contract._lastResult = result;
    }
  }

  _complete(contract) {
    GameState.activeContracts = GameState.activeContracts.filter(c => c.id !== contract.id);
    GameState.completedContracts.push(contract.id);
    this._timers.delete(contract.id);

    GameState.earn(contract.reward);
    GameState.gainXP(contract.xpReward);
    // Add clients based on minLevel difficulty
    GameState.clients += Math.floor(contract.minLevel * 10);
    GameState.satisfaction = Math.min(100, GameState.satisfaction + 15);

    this.ui.toast('🎉 Contract Complete!', `"${contract.name}" — +$${contract.reward.toLocaleString()} • +${contract.xpReward} XP`, 'success');
    this.ui.logEvent(`✅ Contract complete: "${contract.name}" +$${contract.reward.toLocaleString()} • +${contract.xpReward} XP`, 'success');
    this.ui.clearMissionBanner();
    this.ui.showContractComplete(contract);

    if (GameState.activeSite === contract.id) {
      setTimeout(() => {
        this.ui.toast('🚀 Auto-Return', `Securing infrastructure. Teleporting to Home Lab...`, 'info');
        if (window._netSimTeleportHome) window._netSimTeleportHome();
      }, 3000);
    }
  }

  getActiveResult(contractId) {
    const c = GameState.activeContracts.find(ac => ac.id === contractId);
    return c?._lastResult || null;
  }
}

export default ContractsManager;
