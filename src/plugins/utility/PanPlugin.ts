import {
  CADCoreAPI,
  CADPlugin,
  CADPointerEvent,
  CADTool,
  Point2D,
} from '../../core/types';

export class PanTool implements CADTool {
  public id = 'pan';
  public name = 'Pan';
  public category: 'utility' = 'utility';
  public cursor = 'grab';
  public shortcut = 'P';

  private core: CADCoreAPI | null = null;
  private isPanning = false;
  private lastScreenPos: Point2D = { x: 0, y: 0 };

  public onActivate(core: CADCoreAPI): void {
    this.core = core;
    this.core.setPrompt('Press and drag to pan viewport. Esc to exit.');
  }

  public onDeactivate(core: CADCoreAPI): void {
    this.isPanning = false;
  }

  public onPointerDown(e: CADPointerEvent): void {
    if (!this.core || e.button !== 0) return;
    this.isPanning = true;
    this.lastScreenPos = { ...e.screen };
  }

  public onPointerMove(e: CADPointerEvent): void {
    if (!this.core || !this.isPanning) return;
    const dx = e.screen.x - this.lastScreenPos.x;
    const dy = e.screen.y - this.lastScreenPos.y;
    this.lastScreenPos = { ...e.screen };
    this.core.panBy(dx, dy);
  }

  public onPointerUp(e: CADPointerEvent): void {
    this.isPanning = false;
  }

  public cancel(): void {
    this.isPanning = false;
  }
}

export class PanPlugin implements CADPlugin {
  public id = 'core-pan';
  public name = 'Pan Tool';
  public version = '1.0.0';
  public category: 'utility' = 'utility';

  public init(core: CADCoreAPI): void {
    core.registerTool(new PanTool());
  }

  public destroy(): void {}
}
