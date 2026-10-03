import { BoundingBox2D, Point2D } from '../types';

export interface RTreeEntry {
  id: string;
  box: BoundingBox2D;
}

interface RTreeNode {
  isLeaf: boolean;
  box: BoundingBox2D;
  entries?: RTreeEntry[];
  children?: RTreeNode[];
}

export class RTree2D {
  private maxEntries: number;
  private minEntries: number;
  private root: RTreeNode;
  private idToBox: Map<string, BoundingBox2D> = new Map();

  constructor(maxEntries = 9) {
    this.maxEntries = Math.max(4, maxEntries);
    this.minEntries = Math.max(2, Math.floor(this.maxEntries / 2));
    this.root = this.createNode(true);
  }

  public size(): number {
    return this.idToBox.size;
  }

  public clear(): void {
    this.root = this.createNode(true);
    this.idToBox.clear();
  }

  public insert(id: string, box: BoundingBox2D): void {
    // If id already exists, update it by removing first
    if (this.idToBox.has(id)) {
      this.remove(id);
    }

    const normBox = this.normalizeBox(box);
    this.idToBox.set(id, normBox);

    const entry: RTreeEntry = { id, box: normBox };
    this.insertRecursive(this.root, entry);

    if (this.root.entries && this.root.entries.length > this.maxEntries) {
      const split = this.splitLeaf(this.root);
      this.root = {
        isLeaf: false,
        box: this.combineBoxes(split.node1.box, split.node2.box),
        children: [split.node1, split.node2],
      };
    } else if (this.root.children && this.root.children.length > this.maxEntries) {
      const split = this.splitNonLeaf(this.root);
      this.root = {
        isLeaf: false,
        box: this.combineBoxes(split.node1.box, split.node2.box),
        children: [split.node1, split.node2],
      };
    }
  }

  public remove(id: string): boolean {
    const box = this.idToBox.get(id);
    if (!box) return false;
    this.idToBox.delete(id);

    const removed = this.removeRecursive(this.root, id, box);
    if (removed && !this.root.isLeaf && this.root.children && this.root.children.length === 1) {
      this.root = this.root.children[0];
    }
    return removed;
  }

  /**
   * Search for all entity IDs overlapping with queryBox
   */
  public search(queryBox: BoundingBox2D): string[] {
    const results: string[] = [];
    const norm = this.normalizeBox(queryBox);
    this.searchRecursive(this.root, norm, results);
    return results;
  }

  public searchBox(queryBox: BoundingBox2D): string[] {
    return this.search(queryBox);
  }

  /**
   * Search for entities within tolerance of a point
   */
  public searchPoint(point: Point2D, tolerance = 0): string[] {
    const queryBox: BoundingBox2D = {
      minX: point.x - tolerance,
      minY: point.y - tolerance,
      maxX: point.x + tolerance,
      maxY: point.y + tolerance,
    };
    return this.search(queryBox);
  }

  // ---------------------------------------------------------------------------
  // Internal Recursion
  // ---------------------------------------------------------------------------
  private insertRecursive(node: RTreeNode, entry: RTreeEntry): void {
    node.box = this.combineBoxes(node.box, entry.box);

    if (node.isLeaf) {
      node.entries!.push(entry);
      return;
    }

    // Choose subtree with minimal area enlargement
    let bestChild = node.children![0];
    let minEnlargement = Infinity;

    for (const child of node.children!) {
      const enlarged = this.combineBoxes(child.box, entry.box);
      const enlargement = this.boxArea(enlarged) - this.boxArea(child.box);
      if (enlargement < minEnlargement) {
        minEnlargement = enlargement;
        bestChild = child;
      }
    }

    this.insertRecursive(bestChild, entry);

    if (bestChild.isLeaf && bestChild.entries!.length > this.maxEntries) {
      const split = this.splitLeaf(bestChild);
      const idx = node.children!.indexOf(bestChild);
      node.children!.splice(idx, 1, split.node1, split.node2);
    } else if (!bestChild.isLeaf && bestChild.children!.length > this.maxEntries) {
      const split = this.splitNonLeaf(bestChild);
      const idx = node.children!.indexOf(bestChild);
      node.children!.splice(idx, 1, split.node1, split.node2);
    }
  }

  private searchRecursive(node: RTreeNode, query: BoundingBox2D, results: string[]): void {
    if (!this.intersects(node.box, query)) return;

    if (node.isLeaf) {
      for (const entry of node.entries!) {
        if (this.intersects(entry.box, query)) {
          results.push(entry.id);
        }
      }
    } else {
      for (const child of node.children!) {
        this.searchRecursive(child, query, results);
      }
    }
  }

  private removeRecursive(node: RTreeNode, id: string, box: BoundingBox2D): boolean {
    if (!this.intersects(node.box, box)) return false;

    if (node.isLeaf) {
      const idx = node.entries!.findIndex((e) => e.id === id);
      if (idx !== -1) {
        node.entries!.splice(idx, 1);
        this.recalculateBox(node);
        return true;
      }
      return false;
    }

    for (let i = 0; i < node.children!.length; i++) {
      const child = node.children![i];
      if (this.removeRecursive(child, id, box)) {
        this.recalculateBox(node);
        return true;
      }
    }

    return false;
  }

  private splitLeaf(node: RTreeNode): { node1: RTreeNode; node2: RTreeNode } {
    const entries = node.entries!;
    const mid = Math.floor(entries.length / 2);

    // Sort along X
    entries.sort((a, b) => a.box.minX - b.box.minX);

    const g1 = entries.slice(0, mid);
    const g2 = entries.slice(mid);

    const node1 = this.createNode(true);
    node1.entries = g1;
    this.recalculateBox(node1);

    const node2 = this.createNode(true);
    node2.entries = g2;
    this.recalculateBox(node2);

    return { node1, node2 };
  }

  private splitNonLeaf(node: RTreeNode): { node1: RTreeNode; node2: RTreeNode } {
    const children = node.children!;
    const mid = Math.floor(children.length / 2);

    children.sort((a, b) => a.box.minX - b.box.minX);

    const g1 = children.slice(0, mid);
    const g2 = children.slice(mid);

    const node1 = this.createNode(false);
    node1.children = g1;
    this.recalculateBox(node1);

    const node2 = this.createNode(false);
    node2.children = g2;
    this.recalculateBox(node2);

    return { node1, node2 };
  }

  private createNode(isLeaf: boolean): RTreeNode {
    return {
      isLeaf,
      box: { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
      entries: isLeaf ? [] : undefined,
      children: isLeaf ? undefined : [],
    };
  }

  private recalculateBox(node: RTreeNode): void {
    if (node.isLeaf) {
      if (node.entries!.length === 0) {
        node.box = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
        return;
      }
      let b = node.entries![0].box;
      for (let i = 1; i < node.entries!.length; i++) {
        b = this.combineBoxes(b, node.entries![i].box);
      }
      node.box = b;
    } else {
      if (node.children!.length === 0) {
        node.box = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
        return;
      }
      let b = node.children![0].box;
      for (let i = 1; i < node.children!.length; i++) {
        b = this.combineBoxes(b, node.children![i].box);
      }
      node.box = b;
    }
  }

  private combineBoxes(a: BoundingBox2D, b: BoundingBox2D): BoundingBox2D {
    return {
      minX: Math.min(a.minX, b.minX),
      minY: Math.min(a.minY, b.minY),
      maxX: Math.max(a.maxX, b.maxX),
      maxY: Math.max(a.maxY, b.maxY),
    };
  }

  private intersects(a: BoundingBox2D, b: BoundingBox2D): boolean {
    return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
  }

  private boxArea(b: BoundingBox2D): number {
    return Math.max(0, b.maxX - b.minX) * Math.max(0, b.maxY - b.minY);
  }

  private normalizeBox(b: BoundingBox2D): BoundingBox2D {
    return {
      minX: Math.min(b.minX, b.maxX),
      minY: Math.min(b.minY, b.maxY),
      maxX: Math.max(b.minX, b.maxX),
      maxY: Math.max(b.minY, b.maxY),
    };
  }
}
