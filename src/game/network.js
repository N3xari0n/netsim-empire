// ═══════════════════════════════════════════════════════════
//  NetSim Empire — Network Graph (nodes, links, routing)
// ═══════════════════════════════════════════════════════════

import { Node, Link } from '../entities/Node.js';
import GameState from './gameState.js';

let nodeIdCounter = 1;
let linkIdCounter = 1;

export class Network {
  constructor() {
    this.nodes = new Map();   // id → Node
    this.links = new Map();   // id → Link
    this._pathCache = new Map();
  }

  // ── Node Management ──────────────────────────────────────

  addNode(type, gridX, gridY) {
    const id = `n${nodeIdCounter++}`;
    const node = new Node(id, type, gridX, gridY);
    this.nodes.set(id, node);
    this._invalidateCache();
    return node;
  }

  removeNode(id) {
    const node = this.nodes.get(id);
    if (!node) return;

    // Remove all links connected to this node
    const toRemove = [...node.links];
    toRemove.forEach(link => this.removeLink(link.id));

    this.nodes.delete(id);
    this._invalidateCache();
  }

  getNodeAt(gridX, gridY) {
    for (const node of this.nodes.values()) {
      if (node.gridX === gridX && node.gridY === gridY) return node;
    }
    return null;
  }

  // ── Link Management ──────────────────────────────────────

  addLink(fromId, toId, cableType = 'ethernet') {
    const from = this.nodes.get(fromId);
    const to   = this.nodes.get(toId);
    if (!from || !to) return null;
    if (fromId === toId) return null;

    // Prevent duplicate links
    for (const link of from.links) {
      if ((link.from.id === fromId && link.to.id === toId) ||
          (link.from.id === toId   && link.to.id === fromId)) return null;
    }

    const id   = `l${linkIdCounter++}`;
    const link = new Link(id, from, to, cableType);
    this.links.set(id, link);
    from.links.push(link);
    to.links.push(link);
    this._invalidateCache();
    return link;
  }

  removeLink(id) {
    const link = this.links.get(id);
    if (!link) return;

    link.from.links = link.from.links.filter(l => l.id !== id);
    link.to.links   = link.to.links.filter(l => l.id !== id);
    this.links.delete(id);
    this._invalidateCache();
  }

  getLinkBetween(nodeA, nodeB) {
    for (const link of nodeA.links) {
      const other = link.from.id === nodeA.id ? link.to : link.from;
      if (other.id === nodeB.id) return link;
    }
    return null;
  }

  // ── Shortest Path (Dijkstra) ─────────────────────────────

  findPath(fromId, toId) {
    const cacheKey = `${fromId}→${toId}`;
    if (this._pathCache.has(cacheKey)) return this._pathCache.get(cacheKey);

    const dist   = {};
    const prev   = {};
    const visited = new Set();
    const queue  = [];

    for (const id of this.nodes.keys()) { dist[id] = Infinity; }
    dist[fromId] = 0;
    queue.push({ id: fromId, cost: 0 });

    while (queue.length > 0) {
      queue.sort((a, b) => a.cost - b.cost);
      const { id: current } = queue.shift();
      if (visited.has(current)) continue;
      visited.add(current);

      if (current === toId) break;

      const node = this.nodes.get(current);
      if (!node || !node.online) continue;

      for (const link of node.links) {
        if (!link.online) continue;
        const neighbor = link.from.id === current ? link.to : link.from;
        if (!neighbor.online) continue;
        const edgeCost = link.latency * (1 + link.utilization * 2);
        const alt = dist[current] + edgeCost;
        if (alt < dist[neighbor.id]) {
          dist[neighbor.id] = alt;
          prev[neighbor.id] = { nodeId: current, linkId: link.id };
          queue.push({ id: neighbor.id, cost: alt });
        }
      }
    }

    if (dist[toId] === Infinity) {
      this._pathCache.set(cacheKey, null);
      return null;
    }

    // Reconstruct
    const path = [];
    let cur = toId;
    while (cur !== fromId) {
      const p = prev[cur];
      if (!p) break;
      path.unshift({ nodeId: cur, linkId: p.linkId });
      cur = p.nodeId;
    }
    path.unshift({ nodeId: fromId, linkId: null });

    this._pathCache.set(cacheKey, { nodes: path, cost: dist[toId] });
    return this._pathCache.get(cacheKey);
  }

  _invalidateCache() { this._pathCache.clear(); }

  // ── Metrics ──────────────────────────────────────────────

  getMetrics() {
    let totalThroughput = 0;
    let totalLatency    = 0;
    let linkCount       = 0;
    let congestionPressure = 0;

    for (const link of this.links.values()) {
      if (!link.online) continue;
      totalThroughput += link.utilization * link.bandwidth;
      totalLatency    += link.latency * (1 + link.utilization);
      congestionPressure += link.utilization;
      linkCount++;
    }

    const avgLatency = linkCount > 0 ? totalLatency / linkCount : 0;

    return {
      throughputMbps: totalThroughput / 1000,   // Mbps
      latencyMs:      avgLatency,
      congestion:     linkCount > 0 ? congestionPressure / linkCount : 0,
      nodeCount:      this.nodes.size,
      linkCount,
      onlineNodes:    [...this.nodes.values()].filter(n => n.online).length,
    };
  }

  // ── Find Nodes by Type ───────────────────────────────────
  getNodesByType(type) {
    return [...this.nodes.values()].filter(n => n.type === type);
  }

  // ── AABB for viewport culling ─────────────────────────────
  getBounds() {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of this.nodes.values()) {
      minX = Math.min(minX, n.gridX);
      minY = Math.min(minY, n.gridY);
      maxX = Math.max(maxX, n.gridX);
      maxY = Math.max(maxY, n.gridY);
    }
    return { minX, minY, maxX, maxY };
  }
}

export default Network;
