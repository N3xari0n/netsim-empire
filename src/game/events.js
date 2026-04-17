// ═══════════════════════════════════════════════════════════
//  NetSim Empire — Random Events Engine
// ═══════════════════════════════════════════════════════════

import GameState from './gameState.js';

export const EVENT_DEFS = [
  {
    id: 'ddos_minor',
    name: '⚠️ DDoS Wave',
    severity: 'warning',
    desc: 'Incoming DDoS attack detected! Traffic spike on your router.',
    minTime: 60,
    chance: 0.3,
    duration: 15000,
    onTrigger(network, traffic, ui) {
      const routers = network.getNodesByType('Router');
      if (!routers.length) return;
      const target = routers[Math.floor(Math.random() * routers.length)];
      traffic.emitDDoS(target.id, 30);
      ui.toast('⚠️ DDoS Attack', `Mitigate flood on ${target.label} #${target.id}!`, 'warn');
      GameState.satisfaction -= 5;
    },
  },
  {
    id: 'ddos_major',
    name: '🚨 DDoS Storm',
    severity: 'critical',
    desc: 'Massive DDoS storm! Multiple nodes under attack.',
    minTime: 180,
    chance: 0.1,
    duration: 30000,
    onTrigger(network, traffic, ui) {
      const routers = network.getNodesByType('Router');
      routers.slice(0, 2).forEach(r => traffic.emitDDoS(r.id, 60));
      ui.toast('🚨 DDoS STORM', 'Install a Firewall to mitigate!', 'danger');
      GameState.satisfaction -= 15;
    },
  },
  {
    id: 'hw_failure',
    name: '💥 Hardware Failure',
    severity: 'danger',
    desc: 'A device has crashed due to overheating or component failure.',
    minTime: 90,
    chance: 0.2,
    duration: 0,
    onTrigger(network, traffic, ui) {
      const nodes = [...network.nodes.values()].filter(n => n.online);
      if (!nodes.length) return;
      const victim = nodes[Math.floor(Math.random() * nodes.length)];
      victim.takeDamage(victim.healthMax * 0.8);
      victim.pulseAnim = 60;
      GameState.downtime += 10;
      GameState.satisfaction -= 10;
      ui.toast('💥 Hardware Failure', `${victim.label} is critically damaged!`, 'danger');
      ui.logEvent(`${victim.label} (${victim.id}) suffered hardware failure`, 'danger');
    },
  },
  {
    id: 'cable_cut',
    name: '✂️ Cable Cut',
    severity: 'warning',
    desc: 'A physical cable has been severed — redundancy tested.',
    minTime: 60,
    chance: 0.25,
    duration: 20000,
    onTrigger(network, traffic, ui) {
      const links = [...network.links.values()].filter(l => l.online);
      if (!links.length) return;
      const victim = links[Math.floor(Math.random() * links.length)];
      victim.online = false;
      network._invalidateCache();
      GameState.downtime += 5;
      GameState.satisfaction -= 5;
      ui.toast('✂️ Cable Cut', `${victim.label} link severed! Rerouting…`, 'warn');

      // Auto-restore after 20s
      setTimeout(() => {
        victim.online = true;
        network._invalidateCache();
        ui.logEvent(`Link ${victim.id} restored`, 'success');
      }, 20000);
    },
  },
  {
    id: 'traffic_spike',
    name: '📈 Traffic Spike',
    severity: 'info',
    desc: 'Client demand surged — ensure sufficient bandwidth.',
    minTime: 45,
    chance: 0.35,
    duration: 10000,
    onTrigger(network, traffic, ui) {
      traffic.spawnInterval = 80;
      ui.toast('📈 Traffic Spike', 'Demand surged! Monitor your bandwidth.', 'warn');
      setTimeout(() => {
        traffic.spawnInterval = 400;
        ui.logEvent('Traffic spike subsided', 'info');
      }, 12000);
    },
  },
  {
    id: 'ransomware',
    name: '🦠 Ransomware',
    severity: 'critical',
    desc: 'Ransomware detected on a server! Isolate and restore immediately.',
    minTime: 240,
    chance: 0.07,
    duration: 0,
    onTrigger(network, traffic, ui) {
      const servers = network.getNodesByType('Server');
      if (!servers.length) return;
      const victim = servers[Math.floor(Math.random() * servers.length)];
      victim.takeDamage(victim.healthMax * 0.5);
      victim.pulseAnim = 120;
      GameState.satisfaction -= 25;
      GameState.earn(-2000);  // ransom cost
      ui.toast('🦠 RANSOMWARE!', `Server compromised! $2,000 in damages!`, 'danger');
    },
  },
  {
    id: 'power_outage',
    name: '⚡ Power Outage',
    severity: 'critical',
    desc: 'Power grid failure! Devices are going offline.',
    minTime: 120,
    chance: 0.08,
    duration: 15000,
    onTrigger(network, traffic, ui) {
      const nodes = [...network.nodes.values()];
      const count = Math.max(1, Math.floor(nodes.length * 0.3));
      const victims = nodes.sort(() => Math.random() - 0.5).slice(0, count);
      victims.forEach(n => { n.online = false; });
      network._invalidateCache();
      GameState.downtime += 15;
      GameState.satisfaction -= 20;
      ui.toast('⚡ POWER OUTAGE', `${count} devices went offline!`, 'danger');

      setTimeout(() => {
        victims.forEach(n => { n.online = true; n.repair(n.healthMax * 0.5); });
        network._invalidateCache();
        ui.logEvent('Power restored to all devices', 'success');
      }, 15000);
    },
  },
  {
    id: 'contract_bonus',
    name: '💰 Bonus Contract',
    severity: 'success',
    desc: 'A premium client offers an emergency bonus contract!',
    minTime: 90,
    chance: 0.15,
    duration: 0,
    onTrigger(network, traffic, ui) {
      const bonus = Math.floor(Math.random() * 5000) + 2000;
      GameState.earn(bonus);
      GameState.gainXP(100);
      ui.toast('💰 Bonus Contract!', `Emergency contract complete: +$${bonus.toLocaleString()}`, 'success');
    },
  },
  {
    id: 'new_client',
    name: '🤝 New Client',
    severity: 'info',
    desc: 'A new client wants to join your network!',
    minTime: 60,
    chance: 0.2,
    duration: 0,
    onTrigger(network, traffic, ui) {
      GameState.clients++;
      GameState.satisfaction = Math.min(100, GameState.satisfaction + 5);
      ui.toast('🤝 New Client', `Client #${GameState.clients} onboarded successfully!`, 'success');
    },
  },
];

export class EventsEngine {
  constructor(network, traffic, ui) {
    this.network = network;
    this.traffic = traffic;
    this.ui      = ui;
    this.elapsed = 0;       // seconds
    this.nextCheck = 30;    // first event after 30s
    this.eventQueue = [];
    this.lastEvents = new Map();  // event id → last trigger time
  }

  update(dtMs) {
    if (GameState.paused) return;
    this.elapsed += dtMs / 1000;

    if (this.elapsed >= this.nextCheck) {
      this.nextCheck = this.elapsed + (15 + Math.random() * 20);
      this._tryTriggerEvent();
    }
  }

  _tryTriggerEvent() {
    const eligible = EVENT_DEFS.filter(def => {
      const lastT = this.lastEvents.get(def.id) || 0;
      const cooldown = def.minTime;
      return (this.elapsed - lastT) >= cooldown;
    });

    if (!eligible.length) return;

    // Roll for each eligible event
    for (const def of eligible) {
      if (Math.random() < def.chance) {
        this._trigger(def);
        break;  // only one event per check
      }
    }
  }

  _trigger(def) {
    this.lastEvents.set(def.id, this.elapsed);
    this.ui.logEvent(def.desc, def.severity);
    GameState.activeEvents.push({ id: def.id, name: def.name, startTime: this.elapsed });

    try {
      def.onTrigger(this.network, this.traffic, this.ui);
    } catch (e) {
      console.warn('[Events] trigger error:', e);
    }

    // Clean up active events list
    setTimeout(() => {
      GameState.activeEvents = GameState.activeEvents.filter(e => e.id !== def.id || e.startTime !== this.elapsed);
    }, (def.duration || 5000));
  }

  // Manually trigger an event by id (for debugging / tutorial)
  triggerById(id) {
    const def = EVENT_DEFS.find(e => e.id === id);
    if (def) this._trigger(def);
  }
}

export default EventsEngine;
