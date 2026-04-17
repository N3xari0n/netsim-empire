// ═══════════════════════════════════════════════════════════
//  NetSim Empire — Game State Singleton v1.1
//  Developed by: N3xari0n × arrikusuz × Repzyu5
// ═══════════════════════════════════════════════════════════

export const GameState = {
  // Account properties
  currentUser: null, // {id, username, credits, status}
  credits: 0,

  // Progress
  money: 5000,
  level: 1,
  xp: 0,
  xpNext: 500,
  uptime: 100,
  totalTime: 0,        // seconds
  downtime: 0,        // seconds with failures
  paused: false,
  mode: 'campaign', // 'campaign' | 'sandbox'
  activeLayer: 'physical',
  techTier: 1,

  clients: 0,
  satisfaction: 100,

  // Network metrics (rolling 5s avg)
  throughputMbps: 0,
  latencyMs: 0,
  jitterMs: 0,
  packetLossRate: 0,

  // Counters
  totalPacketsSent: 0,
  totalPacketsLost: 0,
  totalBytesTransmitted: 0,

  // Unlocked technologies
  unlockedTech: new Set(['basic_router', 'basic_switch', 'basic_pc', 'basic_server', 'ethernet_cable']),

  // Events
  activeEvents: [],

  // Selected tool
  activeTool: 'select',
  activeCableType: 'ethernet',

  // CLI metrics (for specific contracts)
  _cliAssignmentsCount: 0,
  _maxTracerouteHops: 0,

  // Site Swapping Mechanics
  activeSite: 'home', // 'home' | 'contract_<id>'
  homeNetwork: null,
  homeIpManager: null,

  // Refs
  network: null,
  renderer: null,
  camera: null,
  contracts: null,
  events: null,

  // Contract progress tracking
  activeContracts: [],
  completedContracts: [],

  reset() {
    this.money = 5000;
    this.level = 1;
    this.xp = 0;
    this.xpNext = 500;
    this.uptime = 100;
    this.totalTime = 0;
    this.downtime = 0;
    this.paused = false;
    this.clients = 0;
    this.satisfaction = 100;
    this.throughputMbps = 0;
    this.latencyMs = 0;
    this.jitterMs = 0;
    this.packetLossRate = 0;
    this.totalPacketsSent = 0;
    this.totalPacketsLost = 0;
    this.totalBytesTransmitted = 0;
    this.activeContracts = [];
    this.completedContracts = [];
    this.activeEvents = [];
    this._cliAssignmentsCount = 0;
    this._maxTracerouteHops = 0;
    this.unlockedTech = new Set(['basic_router', 'basic_switch', 'basic_pc', 'basic_server', 'ethernet_cable']);
    this.techTier = 1;
  },

  spend(amount) {
    if (this.money >= amount) { this.money -= amount; return true; }
    return false;
  },

  earn(amount) { this.money = Math.max(0, this.money + amount); },

  gainXP(amount) {
    this.xp += Math.floor(amount);
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.level++;
      this.xpNext = Math.floor(this.xpNext * 1.6);

      // Send toast globally via custom event to avoid huge dependencies here
      const evt = new CustomEvent('netsimLevelUp', { detail: { level: this.level } });
      window.dispatchEvent(evt);
    }
  },

  get uptimePct() {
    if (this.totalTime === 0) return 100;
    return Math.max(0, ((this.totalTime - this.downtime) / this.totalTime) * 100);
  },

  get levelLabel() {
    const labels = ['', 'Startup', 'SMB', 'Enterprise', 'Carrier', 'Global ISP'];
    return `Lv.${this.level} ${labels[Math.min(Math.floor((this.level - 1) / 2) + 1, 5)] || 'Mega Corp'}`;
  },
};

export default GameState;
