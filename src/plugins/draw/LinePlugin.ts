import {
  CADCoreAPI,
  CADPlugin,
  CADPointerEvent,
  CADTool,
  LineEntity,
  Point2D,
} from '../../core/types';
import { AddEntityCommand } from '../../commands/AddEntityCommand';

export class LineTool implements CADTool {
  public id = 'line';
  public name = 'Line';
  public category: 'draw' = 'draw';
  public cursor = 'crosshair';
  public shortcut = 'L';

  private core: CADCoreAPI | null = null;
  private startPoint: Point2D | null = null;

  public getBasePoint(): Point2D | null {
    return this.startPoint ? { ...this.startPoint } : null;
  }

  public onActivate(core: CADCoreAPI): void {
    this.core = core;
    this.startPoint = null;
    this.core.setPrompt('LINE Specify first point:');
  }

  public onDeactivate(core: CADCoreAPI): void {
    this.cancel();
  }

  public onPointerDown(e: CADPointerEvent): void {
    if (!this.core || e.button !== 0) return;

    let pt = e.world;
    if (this.startPoint && this.core.isOrthoMode()) {
      pt = this.applyOrtho(this.startPoint, pt);
    }

    if (!this.startPoint) {
      this.startPoint = { ...pt };
      this.core.setPrompt('LINE Specify next point or [Undo/Esc]:');
    } else {
      // Create committed line entity
      const lineEntity: LineEntity = {
        id: `line_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        type: 'line',
        layerId: this.core.getActiveLayer().id,
        start: { ...this.startPoint },
        end: { ...pt },
        visible: true,
      };

      const cmd = new AddEntityCommand(this.core, lineEntity);
      this.core.executeCommand(cmd);

      // Continue chain from current point like AutoCAD
      this.startPoint = { ...pt };
      this.core.setPrompt('LINE Specify next point or [Enter/Esc to finish]:');
    }
  }

  public onPointerMove(e: CADPointerEvent): void {
    if (!this.core || !this.startPoint) return;

    let pt = e.world;
    if (this.core.isOrthoMode()) {
      pt = this.applyOrtho(this.startPoint, pt);
    }

    const preview: LineEntity = {
      id: '__preview_line__',
      type: 'line',
      layerId: this.core.getActiveLayer().id,
      start: { ...this.startPoint },
      end: { ...pt },
      visible: true,
    };
    this.core.setPreviewEntity(preview);
  }

  public onPointerUp(e: CADPointerEvent): void {
    // Right click finishes line
    if (e.button === 2) {
      this.cancel();
    }
  }

  public onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.cancel();
    }
  }

  public cancel(): void {
    this.startPoint = null;
    if (this.core) {
      this.core.setPreviewEntity(null);
      this.core.setPrompt('Command:');
      this.core.setActiveTool('select');
    }
  }

  private applyOrtho(start: Point2D, current: Point2D): Point2D {
    const dx = Math.abs(current.x - start.x);
    const dy = Math.abs(current.y - start.y);
    if (dx >= dy) {
      return { x: current.x, y: start.y };
    } else {
      return { x: start.x, y: current.y };
    }
  }
}

export class LinePlugin implements CADPlugin {
  public id = 'draw-line';
  public name = 'Line Tool';
  public version = '1.0.0';
  public category: 'draw' = 'draw';

  public init(core: CADCoreAPI): void {
    core.registerTool(new LineTool());
  }

  public destroy(): void {}
}
