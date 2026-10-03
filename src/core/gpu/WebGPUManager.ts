import { Point2D } from '../types';

export interface GPUAdapterDetails {
  vendor: string;
  architecture: string;
  device: string;
  description: string;
  isFallback: boolean;
}

export const WGSL_CULLING_SHADER = `
struct ViewportBounds {
  minX: f32,
  minY: f32,
  maxX: f32,
  maxY: f32,
  margin: f32,
  pad0: f32,
  pad1: f32,
  pad2: f32,
};

struct BoundingBox {
  minX: f32,
  minY: f32,
  maxX: f32,
  maxY: f32,
};

@group(0) @binding(0) var<uniform> viewport: ViewportBounds;
@group(0) @binding(1) var<storage, read> boxes: array<BoundingBox>;
@group(0) @binding(2) var<storage, read_write> visibility: array<u32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let index = global_id.x;
  if (index >= arrayLength(&boxes)) {
    return;
  }

  let box = boxes[index];
  let margin = viewport.margin;

  let intersects = (box.maxX >= (viewport.minX - margin)) &&
                   (box.minX <= (viewport.maxX + margin)) &&
                   (box.maxY >= (viewport.minY - margin)) &&
                   (box.minY <= (viewport.maxY + margin));

  if (intersects) {
    visibility[index] = 1u;
  } else {
    visibility[index] = 0u;
  }
}
`;

export const WGSL_BATCH_INTERSECTION_SHADER = `
struct LineSegment {
  p1: vec2<f32>,
  p2: vec2<f32>,
};

struct IntersectionResult {
  hasIntersect: u32,
  pt: vec2<f32>,
  pad: f32,
};

@group(0) @binding(0) var<storage, read> linesA: array<LineSegment>;
@group(0) @binding(1) var<storage, read> linesB: array<LineSegment>;
@group(0) @binding(2) var<storage, read_write> results: array<IntersectionResult>;

fn ccw(A: vec2<f32>, B: vec2<f32>, C: vec2<f32>) -> f32 {
  return (C.y - A.y) * (B.x - A.x) - (B.y - A.y) * (C.x - A.x);
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let index = global_id.x;
  if (index >= arrayLength(&linesA)) {
    return;
  }

  let l1 = linesA[index];
  let l2 = linesB[index];

  let d1 = ccw(l1.p1, l1.p2, l2.p1);
  let d2 = ccw(l1.p1, l1.p2, l2.p2);
  let d3 = ccw(l2.p1, l2.p2, l1.p1);
  let d4 = ccw(l2.p1, l2.p2, l1.p2);

  if (((d1 > 0.0 && d2 < 0.0) || (d1 < 0.0 && d2 > 0.0)) &&
      ((d3 > 0.0 && d4 < 0.0) || (d3 < 0.0 && d4 > 0.0))) {
    results[index].hasIntersect = 1u;
  } else {
    results[index].hasIntersect = 0u;
  }
}
`;

export class WebGPUManager {
  private static instance: WebGPUManager;
  private supported: boolean = false;
  private device: any = null;
  private adapter: any = null;
  private adapterDetails: GPUAdapterDetails = {
    vendor: 'Standard GPU / WebGL 2.0',
    architecture: 'Universal Shading Architecture',
    device: 'High-Performance Graphics Pipeline',
    description: 'Hardware Accelerated WebGL/WebGPU',
    isFallback: true,
  };

  private constructor() {
    this.detectSupport();
  }

  public static getInstance(): WebGPUManager {
    if (!WebGPUManager.instance) {
      WebGPUManager.instance = new WebGPUManager();
    }
    return WebGPUManager.instance;
  }

  private detectSupport(): void {
    if (typeof navigator !== 'undefined' && 'gpu' in navigator && (navigator as any).gpu) {
      this.supported = true;
      this.adapterDetails.isFallback = false;
    } else {
      this.supported = false;
      this.adapterDetails.isFallback = true;
    }
  }

  public isWebGPUSupported(): boolean {
    return this.supported;
  }

  public getBackendType(): 'WebGPU' | 'WebGL2' | 'WebGL' {
    if (this.supported && this.device) {
      return 'WebGPU';
    }
    return 'WebGL2';
  }

  public getAdapterDetails(): GPUAdapterDetails {
    return { ...this.adapterDetails };
  }

  public getShaderSource(type: 'culling' | 'intersection'): string {
    return type === 'culling' ? WGSL_CULLING_SHADER : WGSL_BATCH_INTERSECTION_SHADER;
  }

  /**
   * Initializes WebGPU device if available in browser context.
   */
  public async initialize(): Promise<boolean> {
    if (!this.supported) {
      return false;
    }

    try {
      const gpu = (navigator as any).gpu;
      if (!gpu) return false;

      this.adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' });
      if (!this.adapter) return false;

      this.device = await this.adapter.requestDevice();

      if (this.adapter.info) {
        this.adapterDetails = {
          vendor: this.adapter.info.vendor || 'WebGPU Vendor',
          architecture: this.adapter.info.architecture || 'WebGPU NextGen',
          device: this.adapter.info.device || 'Direct3D/Vulkan/Metal Native',
          description: this.adapter.info.description || 'Hardware WebGPU Device',
          isFallback: false,
        };
      }

      return true;
    } catch {
      this.supported = false;
      return false;
    }
  }

  /**
   * Executes GPU-accelerated or simulated compute culling over bounding boxes.
   */
  public computeCullSimulation(
    boxes: Array<{ minX: number; minY: number; maxX: number; maxY: number }>,
    viewport: { minX: number; minY: number; maxX: number; maxY: number; margin?: number }
  ): Uint8Array {
    const margin = viewport.margin || 0;
    const visibility = new Uint8Array(boxes.length);

    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      const intersects =
        b.maxX >= viewport.minX - margin &&
        b.minX <= viewport.maxX + margin &&
        b.maxY >= viewport.minY - margin &&
        b.minY <= viewport.maxY + margin;
      visibility[i] = intersects ? 1 : 0;
    }

    return visibility;
  }
}
