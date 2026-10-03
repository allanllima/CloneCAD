import * as THREE from 'three';
import { Point2D } from '../types';

export interface BatchStats {
  totalBatches: number;
  drawCalls: number;
  totalVertices: number;
  memoryEstimateMB: number;
}

export interface BatchedLineItem {
  start: Point2D;
  end: Point2D;
  colorHex: number;
  id?: string;
}

export class InstancedBatchManager {
  private batchGroup: THREE.Group = new THREE.Group();
  private stats: BatchStats = {
    totalBatches: 0,
    drawCalls: 0,
    totalVertices: 0,
    memoryEstimateMB: 0,
  };

  /**
   * Resets all cached batches and disposes allocated geometries.
   */
  public clear(): void {
    while (this.batchGroup.children.length > 0) {
      const child = this.batchGroup.children[0] as any;
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (child.material && !child.material._shared) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m: any) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
      this.batchGroup.remove(child);
    }

    this.stats = {
      totalBatches: 0,
      drawCalls: 0,
      totalVertices: 0,
      memoryEstimateMB: 0,
    };
  }

  public getGroup(): THREE.Group {
    return this.batchGroup;
  }

  public getStats(): BatchStats {
    return { ...this.stats };
  }

  /**
   * Estimates GPU buffer memory in Megabytes for a given vertex count.
   * Standard 3D float vertex: 3 components * 4 bytes = 12 bytes/vertex.
   */
  public static estimateMemoryMB(vertexCount: number): number {
    const bytesPerVertex = 12; // 3 floats (x, y, z)
    const colorBytesPerVertex = 12; // 3 floats (r, g, b)
    const totalBytes = vertexCount * (bytesPerVertex + colorBytesPerVertex);
    return Number((totalBytes / (1024 * 1024)).toFixed(3));
  }

  /**
   * Batches thousands of lines grouped by color into merged THREE.LineSegments geometries.
   * This collapses thousands of draw calls down to 1 draw call per color bucket.
   */
  public batchLines(lines: BatchedLineItem[], materialsCache?: Map<string | number, THREE.LineBasicMaterial>): THREE.Group {
    this.clear();

    if (lines.length === 0) {
      return this.batchGroup;
    }

    // Group line positions by colorHex
    const buckets = new Map<number, number[]>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let bucket = buckets.get(line.colorHex);
      if (!bucket) {
        bucket = [];
        buckets.set(line.colorHex, bucket);
      }
      bucket.push(line.start.x, line.start.y, 0);
      bucket.push(line.end.x, line.end.y, 0);
    }

    let totalVertices = 0;
    let drawCalls = 0;

    buckets.forEach((coords, colorHex) => {
      if (coords.length === 0) return;

      const geometry = new THREE.BufferGeometry();
      const positionAttr = new THREE.Float32BufferAttribute(coords, 3);
      geometry.setAttribute('position', positionAttr);

      let material: THREE.LineBasicMaterial;
      const keyStr = colorHex.toString();
      if (materialsCache && (materialsCache.has(colorHex) || materialsCache.has(keyStr))) {
        material = (materialsCache.get(colorHex) || materialsCache.get(keyStr))!;
      } else {
        material = new THREE.LineBasicMaterial({
          color: colorHex,
          linewidth: 1,
        });
        (material as any)._shared = false;
      }

      const lineSegments = new THREE.LineSegments(geometry, material);
      lineSegments.frustumCulled = false; // We handle culling globally at the batch level
      this.batchGroup.add(lineSegments);

      const vertexCount = coords.length / 3;
      totalVertices += vertexCount;
      drawCalls += 1;
    });

    this.stats = {
      totalBatches: buckets.size,
      drawCalls,
      totalVertices,
      memoryEstimateMB: InstancedBatchManager.estimateMemoryMB(totalVertices),
    };

    return this.batchGroup;
  }
}
