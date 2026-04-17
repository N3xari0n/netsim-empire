// ═══════════════════════════════════════════════════════════
//  NetSim Empire — Traffic Simulation
// ═══════════════════════════════════════════════════════════

import { PACKET_TYPES } from '../entities/Node.js';
import GameState from './gameState.js';

const PACKET_SPEED_BASE = 0.008;   // progress units per ms

export class TrafficSimulator {
  constructor(network) {
    this.network      = network;
    this.spawnTimer   = 0;
    this.spawnInterval = 400;  // ms between spawn batches
    this._totalSent   = 0;
    this._totalLost   = 0;
    this._latencySamples = [];
    this._throughputBytes = 0;
    this._tpWindow    = 0;
  }

  update(dtMs) {
    if (GameState.paused) return;
    const { network } = this;

    // Spawn packets
    this.spawnTimer += dtMs;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this._spawnPackets();
    }

    // Move existing packets
    for (const link of network.links.values()) {
      if (!link.online) {
        link.packets = [];
        continue;
      }
      const speed = PACKET_SPEED_BASE * (link.bandwidth / 100);
      const toRemove = [];

      for (const pkt of link.packets) {
        pkt.progress += speed * dtMs * pkt.speedMult;
        if (pkt.progress >= 1) {
          // Arrived
          this._packetArrived(pkt, link);
          toRemove.push(pkt);
        }
      }
      link.packets = link.packets.filter(p => !toRemove.includes(p));

      // Utilization based on packet count
      link.utilization = Math.min(1, link.packets.length / 12);
    }

    // Throughput calc
    this._tpWindow += dtMs;
    if (this._tpWindow >= 1000) {
      GameState.throughputMbps = (this._throughputBytes * 8) / 1000000;
      this._throughputBytes = 0;
      this._tpWindow = 0;
    }

    // Latency
    if (this._latencySamples.length > 0) {
      GameState.latencyMs = this._latencySamples.reduce((a,b)=>a+b,0) / this._latencySamples.length;
      // jitter = std dev
      const mean = GameState.latencyMs;
      const variance = this._latencySamples.reduce((s,v)=>s+(v-mean)**2,0)/this._latencySamples.length;
      GameState.jitterMs = Math.sqrt(variance);
      this._latencySamples = [];
    }

    // Packet loss
    GameState.totalPacketsSent = this._totalSent;
    GameState.totalPacketsLost = this._totalLost;
    GameState.packetLossRate   = this._totalSent > 0
      ? (this._totalLost / this._totalSent) * 100 : 0;
  }

  _spawnPackets() {
    const { network } = this;
    const nodes = [...network.nodes.values()];
    if (nodes.length < 2) return;

    // How many active contracts drive traffic
    const baseLoad = 1 + GameState.activeContracts.length;
    const spawnCount = Math.floor(Math.random() * baseLoad * 3) + 1;

    for (let i = 0; i < spawnCount; i++) {
      // Pick random src and dst
      const src = nodes[Math.floor(Math.random() * nodes.length)];
      let dst;
      let attempts = 0;
      do {
        dst = nodes[Math.floor(Math.random() * nodes.length)];
        attempts++;
      } while (dst.id === src.id && attempts < 5);

      if (src.id === dst.id || !src.online || !dst.online) continue;

      const path = network.findPath(src.id, dst.id);
      if (!path) continue;

      // Pick packet type
      const pktDef = PACKET_TYPES[Math.floor(Math.random() * (PACKET_TYPES.length - 1))]; // skip DDOS

      this._emitPacketAlongPath(path, pktDef);
      this._totalSent++;
    }

    // Force P2P visibility for any Point-to-Point linked endpoints
    const ENDPOINTS = new Set(['PC', 'Laptop', 'Mobile']);
    for (const link of network.links.values()) {
      if (link.online && ENDPOINTS.has(link.from.type) && ENDPOINTS.has(link.to.type)) {
        if (link.from.online && link.to.online && Math.random() < 0.4) {
          const path = network.findPath(link.from.id, link.to.id);
          if (path) {
             const p2pProtocols = PACKET_TYPES.filter(p => !p.malicious && ['FTP', 'RDP', 'SSH'].includes(p.type));
             const pktDef = p2pProtocols[Math.floor(Math.random() * p2pProtocols.length)] || PACKET_TYPES[0];
             this._emitPacketAlongPath(path, pktDef);
             this._totalSent++;
          }
        }
      }
    }
  }

  _emitPacketAlongPath(path, pktDef) {
    if (path.nodes.length < 2) return;
    
    const { network } = this;
    const startNode = network.nodes.get(path.nodes[0].nodeId);
    const firstNext = network.nodes.get(path.nodes[1].nodeId);
    if (!startNode || !firstNext) return;

    const link = network.getLinkBetween(startNode, firstNext);
    if (!link || !link.online) {
      this._totalLost++;
      return;
    }

    const speedMult = (link.bandwidth / 1000) * (0.8 + Math.random() * 0.4);
    
    // Spawn packet at the START of the route
    link.packets.push({
      id: Math.random().toString(36).slice(2),
      type: pktDef.type,
      color: pktDef.color,
      malicious: pktDef.malicious || false,
      size: pktDef.size,
      progress: 0,
      speedMult: Math.max(0.3, speedMult),
      latency: link.latency,
      
      // Routing info
      fullPath: path.nodes.map(n => n.nodeId), // array of strings (node IDs)
      currentHop: 0, // currently traveling from fullPath[0] to fullPath[1]
      headerText: `${pktDef.type} [${startNode.type}→${network.nodes.get(path.nodes[path.nodes.length-1].nodeId)?.type || 'Unknown'}]`,
    });

    this._throughputBytes += pktDef.size * 1024;
    this._latencySamples.push(link.latency);
  }

  // Called by events system to emit DDoS packets from external
  emitDDoS(targetNodeId, count = 20) {
    const { network } = this;
    const target = network.nodes.get(targetNodeId);
    if (!target) return;

    // Determine hacker position (near the target, off-center)
    const hx = target.gridX + (Math.random() > 0.5 ? 4 : -4);
    const hy = target.gridY + (Math.random() > 0.5 ? 4 : -4);

    // Spawn the temporary attacker
    const hacker = network.addNode('Hacker', hx, hy);
    if (!hacker) return;
    
    // Force physical link (using unseen logic to bypass rules)
    const link = { id: 'l_attack_' + Date.now(), from: hacker, to: target, type: 'wireless', bandwidth: 50000, latency: 1, utilization: 0, packets: [], online: true };
    network.links.set(link.id, link);
    hacker.links.push(link);
    target.links.push(link);
    network._invalidateCache();

    // Select malicious payload
    const maliciousTypes = PACKET_TYPES.filter(p => p.malicious);
    const pktDef = maliciousTypes[Math.floor(Math.random() * maliciousTypes.length)];

    let sent = 0;
    const burst = setInterval(() => {
      if (!network.nodes.has(hacker.id) || !network.nodes.has(target.id) || sent >= count) {
        clearInterval(burst);
        // Despawn hacker
        if (network.links.has(link.id)) network.removeLink(link.id);
        if (network.nodes.has(hacker.id)) network.removeNode(hacker.id);
        return;
      }
      
      const path = network.findPath(hacker.id, target.id);
      if (path) this._emitPacketAlongPath(path, pktDef);
      sent++;
    }, 400); // Pulse every 400ms
  }

  _packetArrived(pkt, oldLink) {
    const { network } = this;

    // Has it reached the end of the line?
    if (pkt.currentHop >= pkt.fullPath.length - 2) {
      // Deliver successfully
      GameState.totalBytesTransmitted += pkt.size * 1024;
      // If DDoS reaches its target
      if (pkt.malicious) {
        const targetId = pkt.fullPath[pkt.fullPath.length - 1];
        const target = network.nodes.get(targetId);
        if (target) {
          target.takeDamage(2);
          target.pulseAnim = 30;
          GameState.satisfaction = Math.max(0, GameState.satisfaction - 0.5);
        }
      }
    } else {
      // Forward to next hop!
      pkt.currentHop++;
      const curId  = pkt.fullPath[pkt.currentHop];
      const nextId = pkt.fullPath[pkt.currentHop + 1];
      
      const curNode  = network.nodes.get(curId);
      const nextNode = network.nodes.get(nextId);
      
      if (!curNode || !nextNode || !curNode.online || !nextNode.online) {
        this._totalLost++;
        return;
      }
      
      const link = network.getLinkBetween(curNode, nextNode);
      if (!link || !link.online) {
        this._totalLost++;
        return;
      }

      // Firewall drop Check
      if (nextNode.type === 'Firewall' && pkt.malicious) {
        this._totalLost++;
        return; // Dropped
      }

      // Congestion drop
      if (link.utilization > 0.9 && Math.random() < 0.3) {
        this._totalLost++;
        return; // Dropped
      }

      // Queue on new link
      pkt.progress = 0;
      pkt.speedMult = Math.max(0.3, (link.bandwidth / 1000) * (0.8 + Math.random() * 0.4));
      link.packets.push(pkt);
      
      this._throughputBytes += pkt.size * 1024;
      this._latencySamples.push(link.latency);
    }
  }
}

export default TrafficSimulator;
