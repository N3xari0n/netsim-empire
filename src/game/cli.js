// ═══════════════════════════════════════════════════════════
//  NetSim Empire — In-Game CLI Terminal
//  Developed by: N3xari0n
// ═══════════════════════════════════════════════════════════

import GameState from './gameState.js';
import { DEVICE_TYPES } from '../entities/Node.js';
import { ALL_CONTRACTS } from './contracts.js';

export class CLI {
  constructor(network, ipManager, hud) {
    this.network = network;
    this.ipManager = ipManager;
    this.hud = hud;
    this.history = [];
    this.historyIdx = -1;
    this.isOpen = false;

    this._setupDOM();
  }

  _setupDOM() {
    this.overlay = document.getElementById('cliOverlay');
    this.output = document.getElementById('cliOutput');
    this.input = document.getElementById('cliInput');

    if (this.input) {
      this.input.addEventListener('keydown', e => this._handleKey(e));
    }

    const closeBtn = document.getElementById('cliClose');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  open() {
    this.isOpen = true;
    this.overlay?.classList.remove('hidden');
    this.input?.focus();
    if (this.history.length === 0) {
      this._print('╔══════════════════════════════════════════════════╗', 'cyan');
      this._print('║    NetSim CLI v1.1 — Network Command Terminal     ║', 'cyan');
      this._print('║    Developed by N3xari0n                          ║', 'cyan');
      this._print('╚══════════════════════════════════════════════════╝', 'cyan');
      this._print('Type "help" for available commands.\n', 'muted');
    }
  }

  close() {
    this.isOpen = false;
    this.overlay?.classList.add('hidden');
  }

  _handleKey(e) {
    if (e.key === 'Enter') {
      const cmd = this.input.value.trim();
      if (cmd) {
        this.history.push(cmd);
        this.historyIdx = this.history.length;
        this._print(`netsim> ${cmd}`, 'green');
        this._execute(cmd);
        this.input.value = '';
      }
    } else if (e.key === 'ArrowUp') {
      if (this.historyIdx > 0) {
        this.historyIdx--;
        this.input.value = this.history[this.historyIdx] || '';
      }
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      if (this.historyIdx < this.history.length - 1) {
        this.historyIdx++;
        this.input.value = this.history[this.historyIdx] || '';
      } else {
        this.historyIdx = this.history.length;
        this.input.value = '';
      }
      e.preventDefault();
    } else if (e.key === 'Escape') {
      this.close();
    }
  }

  // ── Command Router ────────────────────────────────────────

  _execute(raw) {
    const parts = raw.toLowerCase().split(/\s+/);
    const cmd = parts[0];

    switch (cmd) {
      case 'contract': this._cmdContract(parts.slice(1)); break;
      case 'repair': this._cmdRepair(parts.slice(1)); break;
      case 'deploy': this._cmdDeploy(parts.slice(1)); break;
      case 'help': this._cmdHelp(); break;
      case 'clear': this.output.innerHTML = ''; break;
      case 'ping': this._cmdPing(parts.slice(1)); break;
      case 'traceroute':
      case 'tracert': this._cmdTraceroute(parts.slice(1)); break;
      case 'ipconfig':
      case 'ifconfig': this._cmdIpconfig(parts.slice(1)); break;
      case 'ip': this._cmdIP(parts.slice(1)); break;
      case 'subnet': this._cmdSubnet(parts.slice(1)); break;
      case 'show': this._cmdShow(parts.slice(1)); break;
      case 'config':
      case 'configure': this._cmdConfig(parts.slice(1)); break;
      case 'nslookup': this._cmdNslookup(parts.slice(1)); break;
      case 'netstat': this._cmdNetstat(); break;
      case 'whoami': this._cmdWhoami(); break;
      case 'credits': this._cmdCredits(); break;
      default:
        this._print(`Unknown command: '${cmd}'. Type 'help' for commands.`, 'red');
    }
  }

  // ── HELP ──────────────────────────────────────────────────

  _cmdHelp() {
    this._print('╔═══ AVAILABLE COMMANDS ═══════════════════════════╗', 'amber');
    this._print('║ contract list            View available missions ║', 'white');
    this._print('║ contract connect <id>    Warp to client network  ║', 'white');
    this._print('║ contract submit          Validate & complete job ║', 'white');
    this._print('║ contract abort           Emergency return Home   ║', 'white');
    this._print('║ deploy <type> <x> <y>    Build device via CLI    ║', 'white');
    this._print('║ repair <device_id>       Repair offline device   ║', 'white');
    this._print('║ ping <device_id>         Test connectivity       ║', 'white');
    this._print('║ traceroute <device_id>   Show hop-by-hop path    ║', 'white');
    this._print('║ ipconfig                 Show all IP assignments ║', 'white');
    this._print('║ ipconfig <device_id>     Show device IP          ║', 'white');
    this._print('║ ip addr                  List all addresses      ║', 'white');
    this._print('║ subnet calc <ip>/<cidr>  Subnet calculator       ║', 'white');
    this._print('║ show interfaces          Device interfaces       ║', 'white');
    this._print('║ show routes              Routing table           ║', 'white');
    this._print('║ show arp                 ARP table               ║', 'white');
    this._print('║ show topology            Network topology        ║', 'white');
    this._print('║ show stats               Network statistics      ║', 'white');
    this._print('║ config ip <id> <ip/cidr> Assign IP to device     ║', 'white');
    this._print('║ netstat                  Connection stats        ║', 'white');
    this._print('║ whoami                   Current user info       ║', 'white');
    this._print('║ credits                  Game credits info       ║', 'white');
    this._print('║ clear                    Clear terminal          ║', 'white');
    this._print('║ help                     This help menu          ║', 'white');
    this._print('╚═════════════════════════════════════════════════╝', 'amber');
  }

  // ── PING ──────────────────────────────────────────────────

  _cmdPing(args) {
    const targetId = args[0];
    if (!targetId) { this._print('Usage: ping <device_id>', 'red'); return; }

    const target = this.network.nodes.get(targetId);
    if (!target) {
      // Try by IP
      const idByIP = this._findNodeByIP(targetId);
      if (idByIP) return this._pingNode(idByIP);
      this._print(`Host not found: ${targetId}`, 'red');
      return;
    }
    this._pingNode(target);
  }

  _pingNode(target) {
    const assign = this.ipManager.getAssignment(target.id);
    const ip = assign?.ip || '0.0.0.0';

    if (!target.online) {
      this._print(`PING ${ip} — Request timed out. Host unreachable.`, 'red');
      return;
    }

    this._print(`PING ${ip} (${target.label} / ${target.id})...`, 'white');

    // Find path from any online node
    const sources = [...this.network.nodes.values()].filter(n => n.online && n.id !== target.id);
    if (!sources.length) {
      this._print('No source device available.', 'red');
      return;
    }

    const src = sources[0];
    const path = this.network.findPath(src.id, target.id);
    if (!path) {
      this._print(`Destination unreachable: no route to ${ip}`, 'red');
      return;
    }

    const hops = path.nodes.length - 1;
    const latency = path.cost;

    for (let i = 0; i < 4; i++) {
      const jitter = (Math.random() * 2 - 1).toFixed(1);
      const ms = (latency + parseFloat(jitter)).toFixed(1);
      this._print(`  Reply from ${ip}: bytes=64 time=${ms}ms TTL=${64 - hops}`, 'green');
    }

    this._print(`\n--- ${ip} ping statistics ---`, 'white');
    this._print(`4 packets transmitted, 4 received, 0% packet loss`, 'green');
    this._print(`rtt avg = ${latency.toFixed(1)}ms, ${hops} hop(s)`, 'white');
  }

  // ── TRACEROUTE ────────────────────────────────────────────

  _cmdTraceroute(args) {
    const targetId = args[0];
    if (!targetId) { this._print('Usage: traceroute <device_id>', 'red'); return; }

    const target = this.network.nodes.get(targetId) || this._findNodeByIP(targetId);
    if (!target) { this._print(`Unknown host: ${targetId}`, 'red'); return; }

    const sources = [...this.network.nodes.values()].filter(n => n.online && n.id !== target.id);
    if (!sources.length) { this._print('No source available.', 'red'); return; }

    const path = this.network.findPath(sources[0].id, target.id);
    if (!path) { this._print('Destination unreachable.', 'red'); return; }

    const targetIP = this.ipManager.getAssignment(target.id)?.ip || '0.0.0.0';
    this._print(`traceroute to ${targetIP} (${target.label}), max ${path.nodes.length} hops:`, 'white');

    let cumLatency = 0;
    path.nodes.forEach((hop, idx) => {
      const node = this.network.nodes.get(hop.nodeId);
      const assign = this.ipManager.getAssignment(hop.nodeId);
      const ip = assign?.ip || '0.0.0.0';
      if (hop.linkId) {
        const link = this.network.links.get(hop.linkId);
        cumLatency += link?.latency || 0;
      }
      const online = node?.online ? '' : ' * (unreachable)';
      this._print(`  ${idx + 1}.  ${ip.padEnd(18)} ${cumLatency.toFixed(1)}ms  ${node?.label || '?'}${online}`, idx === path.nodes.length - 1 ? 'green' : 'white');
    });
  }

  // ── IPCONFIG ──────────────────────────────────────────────

  _cmdIpconfig(args) {
    if (args[0]) {
      const node = this.network.nodes.get(args[0]);
      if (!node) { this._print(`Device not found: ${args[0]}`, 'red'); return; }
      const assign = this.ipManager.getAssignment(node.id);
      if (!assign) { this._print(`No IP assigned to ${node.id}`, 'amber'); return; }
      this._printAssignment(node, assign);
      return;
    }

    // Show all
    this._print('═══ IP Configuration ═══════════════════════════', 'cyan');
    for (const node of this.network.nodes.values()) {
      const assign = this.ipManager.getAssignment(node.id);
      if (assign) this._printAssignment(node, assign);
    }
  }

  _printAssignment(node, assign) {
    this._print(`\n  ${node.icon} ${node.label} (${node.id}):`, 'cyan');
    this._print(`    IPv4 Address . . . : ${assign.ip}`, 'white');
    this._print(`    Subnet Mask  . . . : ${assign.mask}`, 'white');
    this._print(`    Default Gateway  . : ${assign.gateway}`, 'white');
    this._print(`    CIDR . . . . . . . : /${assign.cidr}`, 'white');
    this._print(`    Status . . . . . . : ${node.online ? '🟢 UP' : '🔴 DOWN'}`, node.online ? 'green' : 'red');
  }

  // ── IP ADDR ───────────────────────────────────────────────

  _cmdIP(args) {
    if (args[0] === 'addr' || args[0] === 'address') {
      this._cmdIpconfig([]);
    } else {
      this._print('Usage: ip addr', 'red');
    }
  }

  // ── SUBNET CALC ───────────────────────────────────────────

  _cmdSubnet(args) {
    if (args[0] !== 'calc' || !args[1]) {
      this._print('Usage: subnet calc <ip>/<cidr>', 'red');
      this._print('Example: subnet calc 192.168.1.0/24', 'muted');
      return;
    }

    const result = this.ipManager.subnetCalc(args[1]);
    if (!result) {
      this._print('Invalid format. Use: subnet calc 192.168.1.0/24', 'red');
      return;
    }

    this._print('╔═══ SUBNET CALCULATION ═══════════════════════╗', 'amber');
    this._print(`║ IP Address     : ${result.ip.padEnd(20)}      ║`, 'white');
    this._print(`║ CIDR Notation  : /${result.cidr}${''.padEnd(25)}║`, 'white');
    this._print(`║ Subnet Mask    : ${result.mask.padEnd(20)}      ║`, 'white');
    this._print(`║ Wildcard Mask  : ${result.wildcardMask.padEnd(20)}      ║`, 'white');
    this._print(`║ Network Addr   : ${result.network.padEnd(20)}      ║`, 'cyan');
    this._print(`║ Broadcast Addr : ${result.broadcast.padEnd(20)}      ║`, 'cyan');
    this._print(`║ First Host     : ${result.firstHost.padEnd(20)}      ║`, 'green');
    this._print(`║ Last Host      : ${result.lastHost.padEnd(20)}      ║`, 'green');
    this._print(`║ Total Hosts    : ${String(result.totalHosts).padEnd(20)}      ║`, 'amber');
    this._print(`║ IP Class       : ${result.class.padEnd(20)}      ║`, 'white');
    this._print(`║ Private        : ${(result.private ? 'Yes' : 'No').padEnd(20)}      ║`, 'white');
    this._print('╚═════════════════════════════════════════════╝', 'amber');
  }

  // ── SHOW ──────────────────────────────────────────────────

  _cmdShow(args) {
    switch (args[0]) {
      case 'interfaces': case 'int': this._showInterfaces(); break;
      case 'routes': case 'route': this._showRoutes(); break;
      case 'arp': this._showARP(); break;
      case 'topology': this._showTopology(); break;
      case 'stats': this._showStats(); break;
      case 'vlan': this._showVLAN(); break;
      default: this._print('Usage: show [interfaces|routes|arp|topology|stats|vlan]', 'red');
    }
  }

  _showInterfaces() {
    this._print('Interface      Status     IP Address         Type        BW', 'cyan');
    this._print('─'.repeat(65), 'muted');
    for (const node of this.network.nodes.values()) {
      const assign = this.ipManager.getAssignment(node.id);
      const ip = assign?.ip || 'unassigned';
      const status = node.online ? '🟢 up   ' : '🔴 down ';
      const bw = node.maxBW >= 1000 ? `${(node.maxBW / 1000).toFixed(0)}Gbps` : `${node.maxBW}Mbps`;
      this._print(`  ${node.id.padEnd(12)} ${status}  ${ip.padEnd(18)} ${node.label.padEnd(12)} ${bw}`, node.online ? 'white' : 'red');
    }
  }

  _showRoutes() {
    this._print('Destination         Gateway           Metric  Interface', 'cyan');
    this._print('─'.repeat(60), 'muted');
    const routers = this.network.getNodesByType('Router');
    for (const router of routers) {
      const assign = this.ipManager.getAssignment(router.id);
      for (const link of router.links) {
        const peer = link.from.id === router.id ? link.to : link.from;
        const peerAssign = this.ipManager.getAssignment(peer.id);
        if (peerAssign) {
          this._print(`  ${peerAssign.subnet.padEnd(20)} ${(assign?.ip || '*').padEnd(18)} ${link.latency.toFixed(0).padStart(4)}    ${router.id}`, 'white');
        }
      }
    }
    if (!routers.length) this._print('  No routers deployed.', 'muted');
  }

  _showARP() {
    this._print('IP Address          MAC Address         Interface    Status', 'cyan');
    this._print('─'.repeat(60), 'muted');
    for (const node of this.network.nodes.values()) {
      const assign = this.ipManager.getAssignment(node.id);
      if (!assign) continue;
      const mac = this._generateMAC(node.id);
      this._print(`  ${assign.ip.padEnd(20)} ${mac.padEnd(20)} ${node.id.padEnd(12)} dynamic`, 'white');
    }
  }

  _showTopology() {
    this._print('═══ NETWORK TOPOLOGY ══════════════════════════', 'cyan');
    this._print(`  Nodes: ${this.network.nodes.size}  |  Links: ${this.network.links.size}`, 'white');
    this._print('', 'white');
    for (const link of this.network.links.values()) {
      const fa = this.ipManager.getAssignment(link.from.id)?.ip || '?';
      const ta = this.ipManager.getAssignment(link.to.id)?.ip || '?';
      const status = link.online ? '═══' : '╌╌╌';
      this._print(`  ${link.from.label}(${fa}) ${status}[${link.label}]${status} ${link.to.label}(${ta})`, link.online ? 'green' : 'red');
    }
  }

  _showStats() {
    const gs = GameState;
    this._print('═══ NETWORK STATISTICS ════════════════════════', 'cyan');
    this._print(`  Throughput   : ${gs.throughputMbps.toFixed(1)} Mbps`, 'white');
    this._print(`  Latency      : ${gs.latencyMs.toFixed(1)} ms`, 'white');
    this._print(`  Jitter       : ${gs.jitterMs.toFixed(1)} ms`, 'white');
    this._print(`  Packet Loss  : ${gs.packetLossRate.toFixed(2)}%`, gs.packetLossRate > 5 ? 'red' : 'white');
    this._print(`  Uptime       : ${gs.uptimePct.toFixed(3)}%`, gs.uptimePct >= 99.9 ? 'green' : 'amber');
    this._print(`  Packets Sent : ${gs.totalPacketsSent}`, 'white');
    this._print(`  Packets Lost : ${gs.totalPacketsLost}`, 'white');
    this._print(`  Satisfaction : ${gs.satisfaction}%`, gs.satisfaction >= 80 ? 'green' : 'red');
  }

  _showVLAN() {
    this._print('VLAN  Name            Subnet               Devices', 'cyan');
    this._print('─'.repeat(60), 'muted');
    // Auto-derive VLANs from unique subnets
    const vlans = new Map();
    for (const [nodeId, assign] of this.ipManager.assignments) {
      if (!vlans.has(assign.subnet)) vlans.set(assign.subnet, []);
      vlans.get(assign.subnet).push(nodeId);
    }
    let vlanId = 1;
    for (const [subnet, members] of vlans) {
      this._print(`  ${String(vlanId).padEnd(6)} VLAN${vlanId}${' '.repeat(12)} ${subnet.padEnd(21)} ${members.join(', ')}`, 'white');
      vlanId++;
    }
    if (vlans.size === 0) this._print('  No VLANs configured.', 'muted');
  }

  // ── CONFIG ────────────────────────────────────────────────

  _cmdConfig(args) {
    if (args[0] === 'ip' && args[1] && args[2]) {
      const nodeId = args[1];
      const ipCidr = args[2];
      const node = this.network.nodes.get(nodeId);
      if (!node) { this._print(`Device not found: ${nodeId}`, 'red'); return; }

      const result = this.ipManager.assignManual(nodeId, ipCidr);
      if (result.error) {
        this._print(`Error: ${result.error}`, 'red');
      } else {
        this._print(`✅ Assigned ${ipCidr} to ${node.label} (${nodeId})`, 'green');
        GameState.gainXP(50);
        this.hud?.toast('🖧 IP Configured', `${node.label} → ${ipCidr}`, 'success');
      }
    } else {
      this._print('Usage: config ip <device_id> <ip>/<cidr>', 'red');
      this._print('Example: config ip n1 192.168.1.10/24', 'muted');
    }
  }

  // ── NETSTAT ───────────────────────────────────────────────

  _cmdNetstat() {
    this._print('Active Connections:', 'cyan');
    this._print('  Proto  Local Address          Foreign Address        State', 'muted');
    for (const link of this.network.links.values()) {
      if (!link.online) continue;
      const fa = this.ipManager.getAssignment(link.from.id)?.ip || '?';
      const ta = this.ipManager.getAssignment(link.to.id)?.ip || '?';
      const port = 80 + Math.floor(Math.random() * 9000);
      this._print(`  TCP    ${(fa + ':' + port).padEnd(23)} ${(ta + ':443').padEnd(23)} ESTABLISHED`, 'white');
    }
  }

  // ── MISC ──────────────────────────────────────────────────

  _cmdNslookup(args) {
    this._print('DNS not configured in simulation.', 'amber');
    this._print('Use device IDs (e.g., n1, n2) or IPs for addressing.', 'muted');
  }

  _cmdWhoami() {
    const user = GameState.currentUser;
    this._print(`User: ${user?.username || 'guest'}`, 'cyan');
    this._print(`Level: ${GameState.levelLabel}`, 'white');
    this._print(`Credits: ${GameState.credits || 0}`, 'amber');
  }

  _cmdCredits() {
    this._print('Game credits: N3xari0n × arrikusuz × Repzyu5', 'cyan');
    this._print('NetSim Empire v1.1 — Educational Network Simulator', 'white');
  }

  // ── DEPLOY ────────────────────────────────────────────────

  _cmdDeploy(args) {
    if (args.length < 3) {
      this._print('Usage: deploy <type> <x> <y>', 'red');
      this._print('Example: deploy Router 15 20', 'muted');
      return;
    }
    const typeStr = args[0].toLowerCase();
    const typeMap = { 'pc': 'PC', 'laptop': 'Laptop', 'mobile': 'Mobile', 'router': 'Router', 'switch': 'Switch', 'server': 'Server', 'firewall': 'Firewall', 'wifiap': 'WiFiAP', 'loadbalancer': 'LoadBalancer', 'ids': 'IDS', 'cdn': 'CDN', 'corerouter': 'CoreRouter', 'hyperscaler': 'Hyperscaler' };
    const type = typeMap[typeStr];

    if (!type) {
      this._print(`Unknown device type: ${args[0]}.`, 'red');
      return;
    }

    const x = parseInt(args[1], 10);
    const y = parseInt(args[2], 10);
    if (isNaN(x) || isNaN(y)) {
      this._print('Invalid coordinates. X and Y must be valid integers.', 'red');
      return;
    }

    if (this.network.getNodeAt(x, y)) {
      this._print(`Grid location (${x}, ${y}) is already occupied.`, 'amber');
      return;
    }

    const def = DEVICE_TYPES[type];
    if (!GameState.spend(def.cost)) {
      this._print(`Insufficient funds. ${type} costs $${def.cost.toLocaleString()}.`, 'red');
      return;
    }

    const node = this.network.addNode(type, x, y);
    this._print(`Successfully deployed ${type} [ID: ${node.id}] at (${x}, ${y}).`, 'green');
    this.hud.toast('✅ Deployed', `CLI constructed ${type} at (${x}, ${y})`, 'success');
  }

  // ── REPAIR ────────────────────────────────────────────────

  _cmdRepair(args) {
    if (args.length < 1) {
      this._print('Usage: repair <device_id>', 'red');
      return;
    }
    const targetId = args[0];
    const node = this.network.nodes.get(targetId);

    if (!node) {
      this._print(`Unknown host: ${targetId}`, 'red');
      return;
    }

    if (node.health >= node.healthMax) {
      this._print(`System ${node.id} is healthy. No repair needed.`, 'white');
      return;
    }

    if (node.rebooting) {
      this._print(`System ${node.id} is already undergoing repair.`, 'amber');
      return;
    }

    const def = DEVICE_TYPES[node.type] || { cost: 500 };
    const cost = Math.max(10, Math.floor(def.cost * 0.30));

    if (!GameState.spend(cost)) {
      this._print(`Repair sequence failed: Insufficient funds ($${cost.toLocaleString()} required).`, 'red');
      return;
    }

    const oldHealth = node.health;
    node.rebooting = true;
    node.online = false;
    this.network._invalidateCache();

    this._print(`Initiating repair sequence for ${node.id}...`, 'cyan');
    this._print(`Target system offline. Estimated downtime: 5s.`, 'amber');

    setTimeout(() => {
      if (!this.network.nodes.has(node.id)) return;

      node.rebooting = false;
      node.rebootCount++;
      node.repair(node.healthMax);
      this.network._invalidateCache();

      this._print(`Repair complete. System ${node.id} online and fully restored.`, 'green');
      this.hud.logEvent(`CLI Repaired ${node.label}: ${oldHealth}→${node.healthMax} HP (Cost: $${cost})`, 'success');
    }, 5000);
  }

  // ── CONTRACTS ─────────────────────────────────────────────


  _cmdContract(args) {
    if (args.length === 0) {
      this._print('Usage: contract [list | connect <id> | submit | abort]', 'amber');
      return;
    }

    const action = args[0].toLowerCase();

    if (action === 'list') {
      this._print('═══ Available Contracts ══════════════════════════', 'cyan');
      const avail = ALL_CONTRACTS.filter(c => GameState.level >= c.minLevel && !GameState.completedContracts.includes(c.id));
      if (avail.length === 0) {
        this._print('No contracts currently available for your clearance level.', 'white');
        return;
      }
      avail.forEach(c => {
        this._print(`[ ${c.id.padEnd(4)} ] ${c.name} [Reward: $${c.reward}]`, 'green');
        this._print(`        Client: ${c.client}`, 'white');
        this._print(`        Desc:   ${c.desc}`, 'muted');
      });
      return;
    }

    if (action === 'connect') {
      const id = args[1]?.toLowerCase();
      if (!id) { this._print('Usage: contract connect <id>', 'amber'); return; }

      const contract = ALL_CONTRACTS.find(c => c.id.toLowerCase() === id);
      if (!contract) { this._print(`Contract ID ${id} not found.`, 'red'); return; }
      if (GameState.level < contract.minLevel) { this._print('Clearance level too low.', 'red'); return; }
      if (GameState.activeSite === id) { this._print('Already connected to this client site.', 'amber'); return; }

      // Execute Teleport Pipeline
      if (GameState.contracts && GameState.contracts.accept(id, null)) {
        this._print(`[SYS] Initializing secure tunnel to ${contract.client}...`, 'cyan');
        this._print(`[SYS] Connection established. Welcome to the client grid.`, 'green');
      } else {
        this._print(`[SYS] Connection refused. You may need to return to your Home Lab or drop your current contract.`, 'red');
      }
      return;
    }

    if (action === 'submit') {
      if (GameState.activeSite === 'home') {
        this._print('You are currently in your Home Lab. Connect to a contract site first.', 'red');
        return;
      }
      const contract = ALL_CONTRACTS.find(c => c.id === GameState.activeSite);
      if (!contract) return;

      this._print(`[SYS] Initiating compliance scan for ${contract.client}...`, 'cyan');
      // Validate against current grid
      const netRef = window._netSimGetNetwork ? window._netSimGetNetwork() : this.network;
      const res = contract.check(netRef, GameState);
      if (res.done) {
        GameState.money += contract.reward;
        GameState.xp += contract.xpReward;
        GameState.completedContracts.push(contract.id);
        this._print(`[SYS] Scan Passed: ${res.reason}`, 'green');
        this._print(`[SYS] Payment Received: $${contract.reward.toLocaleString()}. Contract Terminated.`, 'green');

        setTimeout(() => {
          this._print(`[SYS] Dropping secure tunnel. Returning Home...`, 'cyan');
          window._netSimTeleportHome();
        }, 2000);

      } else {
        this._print(`[SYS] Scan Failed: ${res.reason}`, 'red');
      }
      return;
    }

    if (action === 'abort') {
      if (GameState.activeSite === 'home') {
        this._print('You are already at Home.', 'amber');
        return;
      }
      this._print(`[SYS] Emergency Disconnect Triggered. Returning Home...`, 'red');
      window._netSimTeleportHome();
      return;
    }

    this._print(`Unknown contract command: ${action}`, 'red');
  }

  // ── Output Helpers ────────────────────────────────────────

  _print(text, color = 'white') {
    if (!this.output) return;
    const colorMap = {
      white: '#e8f0fe', green: '#39ff14', red: '#ff2244',
      cyan: '#00f5ff', amber: '#ffb800', muted: '#4a5568',
    };
    const line = document.createElement('div');
    line.style.color = colorMap[color] || color;
    line.style.fontFamily = '"Share Tech Mono", monospace';
    line.style.fontSize = '12px';
    line.style.lineHeight = '1.6';
    line.style.whiteSpace = 'pre';
    line.textContent = text;
    this.output.appendChild(line);
    this.output.scrollTop = this.output.scrollHeight;
  }

  _findNodeByIP(ip) {
    for (const [nodeId, assign] of this.ipManager.assignments) {
      if (assign.ip === ip) return this.network.nodes.get(nodeId);
    }
    return null;
  }

  _generateMAC(nodeId) {
    let hash = 0;
    for (let i = 0; i < nodeId.length; i++) hash = ((hash << 5) - hash) + nodeId.charCodeAt(i);
    const hex = Math.abs(hash).toString(16).padStart(12, 'a');
    return hex.match(/.{2}/g).join(':').substring(0, 17);
  }
}

export default CLI;
