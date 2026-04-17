// ═══════════════════════════════════════════════════════════
//  NetSim Empire — Entity Definitions
// ═══════════════════════════════════════════════════════════

import GameState from '../game/gameState.js';
export const DEVICE_TYPES = {
  Mobile:       { icon: '📱', color: '#68b5e2', maxBW: 50,    healthMax: 50,  cost: 200,   tier: 1, label: 'Mobile', desc: 'Wireless terminal endpoint' },
  Laptop:       { icon: '💻', color: '#82a1c1', maxBW: 100,   healthMax: 80,  cost: 400,   tier: 1, label: 'Laptop', desc: 'Portable endpoint' },
  PC:           { icon: '🖥️', color: '#a0b4d0', maxBW: 100,   healthMax: 100, cost: 500,   tier: 1, label: 'PC', desc: 'Workstation endpoint' },
  Router:       { icon: '📡', color: '#00f5ff', maxBW: 1000,  healthMax: 150, cost: 1500,  tier: 1, label: 'Router', desc: 'Layer-3 routing device' },
  Switch:       { icon: '🔀', color: '#7ec8ff', maxBW: 1000,  healthMax: 120, cost: 800,   tier: 1, label: 'Switch', desc: 'Layer-2 switching fabric' },
  Server:       { icon: '🗄️', color: '#b44bff', maxBW: 10000, healthMax: 200, cost: 3000,  tier: 1, label: 'Server', desc: 'Application/data server' },
  Firewall:     { icon: '🛡️', color: '#ff2244', maxBW: 5000,  healthMax: 180, cost: 2500,  tier: 2, label: 'Firewall', desc: 'Security filtering device' },
  WiFiAP:       { icon: '📶', color: '#39ff14', maxBW: 600,   healthMax: 80,  cost: 1200,  tier: 2, label: 'WiFi AP', desc: 'Wireless access point' },
  LoadBalancer: { icon: '⚖️', color: '#ffb800', maxBW: 40000, healthMax: 200, cost: 5000,  tier: 3, label: 'Load Balancer', desc: 'Distributes traffic across servers' },
  IDS:          { icon: '🔍', color: '#ff6b9d', maxBW: 8000,  healthMax: 160, cost: 8000,  tier: 3, label: 'IDS/IPS', desc: 'Intrusion detection & prevention system' },
  CDN:          { icon: '🌐', color: '#ff006e', maxBW: 100000,healthMax: 300, cost: 15000, tier: 4, label: 'CDN Node', desc: 'Content delivery edge node' },
  CoreRouter:   { icon: '🔥', color: '#ff8c00', maxBW: 200000,healthMax: 350, cost: 25000, tier: 4, label: 'Core Router', desc: 'High-performance backbone router' },
  Hyperscaler:  { icon: '🏗️', color: '#00e5ff', maxBW: 500000,healthMax: 500, cost: 75000, tier: 5, label: 'Hyperscaler', desc: 'Massive-scale cloud compute node' },
  Hacker:       { icon: '💀', color: '#ff2244', maxBW: 10000, healthMax: 1000, cost: 0,     tier: 0, label: 'Malicious Actor', desc: 'External Threat Source' },
};

export const LINK_TYPES = {
  ethernet:  { icon: '🟠', label: 'Copper',       bandwidth: 100,    latency: 2,    color: '#e8800a', glowColor: '#ffaa44', cost: 50,    tier: 1 },
  fiber:     { icon: '🔵', label: 'Fiber 10G',    bandwidth: 10000,  latency: 0.5,  color: '#0080ff', glowColor: '#44aaff', cost: 200,   tier: 2 },
  wireless:  { icon: '📶', label: 'Wireless',     bandwidth: 600,    latency: 5,    color: '#39ff14', glowColor: '#80ff60', cost: 80,    tier: 2 },
  fiber400:  { icon: '💎', label: '400G Fiber',   bandwidth: 400000, latency: 0.1,  color: '#00f5ff', glowColor: '#80faff', cost: 2000,  tier: 4 },
  satellite: { icon: '🛰️', label: 'Satellite',   bandwidth: 50000,  latency: 20,   color: '#c084fc', glowColor: '#d8b4fe', cost: 5000,  tier: 4 },
};

export const PACKET_TYPES = [
  { type: 'HTTP',  color: '#00f5ff', size: 1,   priority: 2, label: 'Web' },
  { type: 'HTTPS', color: '#ff00ff', size: 1.5, priority: 2, label: 'Secure Web' },
  { type: 'DNS',   color: '#aaaaff', size: 0.1, priority: 1, label: 'Lookup' },
  { type: 'VoIP',  color: '#39ff14', size: 0.2, priority: 4, label: 'Voice' },
  { type: 'Video', color: '#b44bff', size: 5,   priority: 3, label: 'Stream' },
  { type: 'FTP',   color: '#ffb800', size: 10,  priority: 1, label: 'File' },
  { type: 'SSH',   color: '#ff8c00', size: 0.5, priority: 4, label: 'Terminal' },
  { type: 'SMTP',  color: '#ffd700', size: 2,   priority: 1, label: 'Mail' },
  { type: 'SQL',   color: '#00fa9a', size: 3,   priority: 3, label: 'Database' },
  { type: 'RDP',   color: '#00ced1', size: 4,   priority: 3, label: 'Remote' },
  { type: 'Malware',color:'#7c0a02', size: 1,   priority: 1, label: 'Worm', malicious: true },
  { type: 'DDOS',  color: '#ff2244', size: 0.1, priority: 1, label: 'ATTACK', malicious: true },
];    

export class Node {
  constructor(id, type, gridX, gridY) {
    const def = DEVICE_TYPES[type] || DEVICE_TYPES.Router;
    this.id       = id;
    this.type     = type;
    this.gridX    = gridX;
    this.gridY    = gridY;
    this.health   = def.healthMax;
    this.healthMax= def.healthMax;
    this.online   = true;
    this.tier     = def.tier;
    this.label    = def.label;
    this.icon     = def.icon;
    this.color    = def.color;
    this.maxBW    = def.maxBW;
    this.links    = [];
    this.rxBytes  = 0;
    this.txBytes  = 0;
    this.packetDrop = 0;
    this.glowPhase = Math.random() * Math.PI * 2;
    this.selected = false;
    this.highlighted = false;
    this.pulseAnim = 0;
    this.rebootCount = 0;
    this.rebooting = false;
  }

  takeDamage(amt) {
    if (this.rebooting) return; // Immune/already offline while rebooting
    this.health = Math.max(0, this.health - amt);
    if (this.health === 0 && this.online) {
      this.online = false;
      // Invalidate routing cache so no data routes through this dead node
      if (GameState?.network) GameState.network._invalidateCache();
    }
  }

  repair(amt) {
    this.health = Math.min(this.healthMax, this.health + amt);
    if (this.health > 0) this.online = true;
  }

  get healthPct() { return this.health / this.healthMax; }

  toInspect() {
    const def = DEVICE_TYPES[this.type];
    let statusText = this.online ? '🟢 Online' : '🔴 Offline';
    if (this.rebooting) statusText = '🟡 Rebooting';

    return [
      ['Type',   this.label],
      ['Health', `${this.health}/${this.healthMax}`],
      ['Status', statusText],
      ['BW Max', `${this.maxBW >= 1000 ? (this.maxBW/1000).toFixed(0)+'Gbps' : this.maxBW+'Mbps'}`],
      ['Links',  this.links.length],
      ['Reboots', this.rebootCount],
      ['Pos',    `(${this.gridX}, ${this.gridY})`],
    ];
  }
}

export class Link {
  constructor(id, fromNode, toNode, cableType = 'ethernet') {
    const def = LINK_TYPES[cableType] || LINK_TYPES.ethernet;
    this.id         = id;
    this.from       = fromNode;
    this.to         = toNode;
    this.cableType  = cableType;
    this.bandwidth  = def.bandwidth;
    this.latency    = def.latency;
    this.color      = def.color;
    this.glowColor  = def.glowColor;
    this.utilization= 0;   // 0-1
    this.health     = 100;
    this.online     = true;
    this.packets    = [];   // active packet animations
    this.cost       = def.cost;
  }

  get label() { return LINK_TYPES[this.cableType]?.label || this.cableType; }

  toInspect() {
    return [
      ['Type',   this.label],
      ['BW',     `${this.bandwidth >= 1000 ? (this.bandwidth/1000)+'Gbps' : this.bandwidth+'Mbps'}`],
      ['Latency', `${this.latency}ms`],
      ['Usage',  `${(this.utilization*100).toFixed(1)}%`],
      ['Status', this.online ? '🟢 Active' : '🔴 Severed'],
    ];
  }
}
