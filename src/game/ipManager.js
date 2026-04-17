// ═══════════════════════════════════════════════════════════
//  NetSim Empire — IP Manager (Subnet / Address Assignment)
//  Developed by: Nexarion × Ollama × AntiGravity
// ═══════════════════════════════════════════════════════════

export class IPManager {
  constructor() {
    this.assignments = new Map();  // nodeId → { ip, cidr, subnet, gateway }
    this.subnets     = [];         // allocated subnets
    this._nextOctet3 = 1;         // 10.0.X.0
  }

  // ── Auto-assign IP when device placed ─────────────────────
  assignAuto(node, network) {
    if (this.assignments.has(node.id)) return this.assignments.get(node.id);

    // Determine subnet based on connected peers
    let subnet = this._findConnectedSubnet(node, network);
    if (!subnet) {
      subnet = this._allocateNewSubnet();
    }

    const hostNum = this._getNextHost(subnet);
    const ip = `${subnet.network[0]}.${subnet.network[1]}.${subnet.network[2]}.${hostNum}`;

    const assignment = {
      ip,
      cidr: subnet.cidr,
      mask: this.cidrToMask(subnet.cidr),
      subnet: `${subnet.network.join('.')}/${subnet.cidr}`,
      gateway: `${subnet.network[0]}.${subnet.network[1]}.${subnet.network[2]}.1`,
      nodeId: node.id,
    };

    this.assignments.set(node.id, assignment);
    return assignment;
  }

  // ── Manual IP assignment via CLI ──────────────────────────
  assignManual(nodeId, ipWithCidr) {
    const match = ipWithCidr.match(/^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/);
    if (!match) return { error: 'Invalid format. Use: x.x.x.x/cidr' };

    const ip   = match[1];
    const cidr = parseInt(match[2]);

    if (!this.validateIP(ip)) return { error: 'Invalid IP address' };
    if (cidr < 8 || cidr > 30) return { error: 'CIDR must be 8-30' };

    // Check for conflicts
    const conflict = this._checkConflict(nodeId, ip);
    if (conflict) return { error: `IP conflict with device ${conflict}` };

    const networkAddr = this.getNetworkAddress(ip, cidr);
    const assignment = {
      ip,
      cidr,
      mask: this.cidrToMask(cidr),
      subnet: `${networkAddr}/${cidr}`,
      gateway: this._deriveGateway(networkAddr),
      nodeId,
    };

    this.assignments.set(nodeId, assignment);
    return { success: true, assignment };
  }

  removeAssignment(nodeId) {
    this.assignments.delete(nodeId);
  }

  getAssignment(nodeId) {
    return this.assignments.get(nodeId) || null;
  }

  // ── Subnet Calculation Utilities ──────────────────────────

  subnetCalc(ipCidr) {
    const match = ipCidr.match(/^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/);
    if (!match) return null;

    const ip   = match[1];
    const cidr = parseInt(match[2]);
    const maskBits = 0xFFFFFFFF << (32 - cidr) >>> 0;
    const ipNum    = this.ipToNum(ip);
    const netNum   = (ipNum & maskBits) >>> 0;
    const bcastNum = (netNum | ~maskBits) >>> 0;
    const hostCount = Math.max(0, (1 << (32 - cidr)) - 2);

    return {
      ip,
      cidr,
      mask:          this.numToIP(maskBits),
      network:       this.numToIP(netNum),
      broadcast:     this.numToIP(bcastNum),
      firstHost:     hostCount > 0 ? this.numToIP(netNum + 1) : 'N/A',
      lastHost:      hostCount > 0 ? this.numToIP(bcastNum - 1) : 'N/A',
      totalHosts:    hostCount,
      wildcardMask:  this.numToIP(~maskBits >>> 0),
      class:         this._getIPClass(ip),
      private:       this._isPrivate(ip),
    };
  }

  // ── IP Math ────────────────────────────────────────────────

  ipToNum(ip) {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  }

  numToIP(num) {
    return [(num >>> 24) & 0xFF, (num >>> 16) & 0xFF, (num >>> 8) & 0xFF, num & 0xFF].join('.');
  }

  cidrToMask(cidr) {
    return this.numToIP((0xFFFFFFFF << (32 - cidr)) >>> 0);
  }

  getNetworkAddress(ip, cidr) {
    const maskBits = (0xFFFFFFFF << (32 - cidr)) >>> 0;
    const netNum   = (this.ipToNum(ip) & maskBits) >>> 0;
    return this.numToIP(netNum);
  }

  getBroadcast(ip, cidr) {
    const maskBits = (0xFFFFFFFF << (32 - cidr)) >>> 0;
    const netNum   = (this.ipToNum(ip) & maskBits) >>> 0;
    return this.numToIP((netNum | ~maskBits) >>> 0);
  }

  validateIP(ip) {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    return parts.every(p => {
      const n = parseInt(p);
      return !isNaN(n) && n >= 0 && n <= 255;
    });
  }

  // ── Internal ──────────────────────────────────────────────

  _allocateNewSubnet() {
    const subnet = {
      network: [10, 0, this._nextOctet3, 0],
      cidr: 24,
      usedHosts: new Set([1]),  // .1 reserved for gateway
    };
    this.subnets.push(subnet);
    this._nextOctet3++;
    return subnet;
  }

  _findConnectedSubnet(node, network) {
    for (const link of node.links) {
      const peer = link.from.id === node.id ? link.to : link.from;
      const peerAssign = this.assignments.get(peer.id);
      if (peerAssign) {
        const subnetKey = peerAssign.subnet;
        return this.subnets.find(s => `${s.network.join('.')}/${s.cidr}` === subnetKey);
      }
    }
    return null;
  }

  _getNextHost(subnet) {
    for (let i = 2; i < 254; i++) {
      if (!subnet.usedHosts.has(i)) {
        subnet.usedHosts.add(i);
        return i;
      }
    }
    return 254; // fallback
  }

  _checkConflict(nodeId, ip) {
    for (const [nid, assign] of this.assignments) {
      if (nid !== nodeId && assign.ip === ip) return nid;
    }
    return null;
  }

  _deriveGateway(networkAddr) {
    const parts = networkAddr.split('.');
    parts[3] = '1';
    return parts.join('.');
  }

  _getIPClass(ip) {
    const first = parseInt(ip.split('.')[0]);
    if (first < 128)  return 'A';
    if (first < 192)  return 'B';
    if (first < 224)  return 'C';
    if (first < 240)  return 'D (Multicast)';
    return 'E (Reserved)';
  }

  _isPrivate(ip) {
    const parts = ip.split('.').map(Number);
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    return false;
  }

  // ── Serialization ─────────────────────────────────────────

  toJSON() {
    const entries = [];
    for (const [k, v] of this.assignments) {
      entries.push([k, v]);
    }
    return { assignments: entries, nextOctet3: this._nextOctet3 };
  }

  fromJSON(data) {
    if (!data) return;
    this.assignments = new Map(data.assignments || []);
    this._nextOctet3 = data.nextOctet3 || 1;
    // Rebuild subnets from assignments
    this.subnets = [];
    const seen = new Set();
    for (const assign of this.assignments.values()) {
      if (!seen.has(assign.subnet)) {
        seen.add(assign.subnet);
        const parts = assign.subnet.split('/');
        const net   = parts[0].split('.').map(Number);
        this.subnets.push({ network: net, cidr: parseInt(parts[1]), usedHosts: new Set([1]) });
      }
    }
  }
}

export default IPManager;
