import {
  CADCoreAPI,
  CADEntity,
  CADPlugin,
  CADPointerEvent,
  CADTool,
  Point2D,
} from '../../core/types';
import { TransformEntityCommand } from '../../commands/TransformEntityCommand';

export class MoveTool implements CADTool {
  public id = 'move';
  public name = 'Move';
  public category: 'modify' = 'modify';
  public cursor = 'crosshair';
  public shortcut = 'M';

  private core: CADCoreAPI | null = null;
  private selectedEntities: CADEntity[] = [];
  private basePoint: Point2D | null = null;

  public onActivate(core: CADCoreAPI): void {
    this.core = core;
    this.selectedEntities = core.getSelectedEntities();
    this.basePoint = null;

    if (this.selectedEntities.length === 0) {
      core.setPrompt('MOVE Select objects first, or pick object to move:');
    } else {
      core.setPrompt(`MOVE ${this.selectedEntities.length} object(s) selected. Specify base point:`);
    }
  }

  public onDeactivate(core: CADCoreAPI): void {
    this.cancel();
  }

  public onPointerDown(e: CADPointerEvent): void {
    if (!this.core || e.button !== 0) return;

    if (this.selectedEntities.length === 0) {
      const selectionMgr = (this.core as any).getSelectionManager();
      const tol = 8 / this.core.getViewport().zoom;
      const clicked = selectionMgr.pickEntity(this.core.getEntities(), e.world, tol);
      if (clicked) {
        this.selectedEntities = [clicked];
        this.core.selectEntities([clicked.id], false);
        this.core.setPrompt('MOVE Specify base point:');
      }
      return;
    }

    if (!this.basePoint) {
      this.basePoint = { ...e.world };
      this.core.setPrompt('MOVE Specify second point:');
    } else {
      const dx = e.world.x - this.basePoint.x;
      const dy = e.world.y - this.basePoint.y;

      const after = this.selectedEntities.map((ent) => this.translateEntity(ent, dx, dy));
      const cmd = new TransformEntityCommand(this.core, this.selectedEntities, after, 'MOVE');
      this.core.executeCommand(cmd);

      this.cancel();
    }
  }

  public onPointerMove(e: CADPointerEvent): void {
    if (!this.core || !this.basePoint || this.selectedEntities.length === 0) return;

    const dx = e.world.x - this.basePoint.x;
    const dy = e.world.y - this.basePoint.y;

    // Show preview of first entity or composite preview
    const preview = this.translateEntity(this.selectedEntities[0], dx, dy);
    this.core.setPreviewEntity(preview);
  }

  public onPointerUp(e: CADPointerEvent): void {}

  public cancel(): void {
    this.basePoint = null;
    this.selectedEntities = [];
    if (this.core) {
      this.core.setPreviewEntity(null);
      this.core.setPrompt('Command:');
      this.core.setActiveTool('select');
    }
  }

  private translateEntity(ent: CADEntity, dx: number, dy: number): CADEntity {
    const copy = JSON.parse(JSON.stringify(ent));
    if (copy.type === 'line') {
      copy.start.x += dx;
      copy.start.y += dy;
      copy.end.x += dx;
      copy.end.y += dy;
    } else if (copy.type === 'circle') {
      copy.center.x += dx;
      copy.center.y += dy;
    } else if (copy.type === 'rectangle') {
      copy.origin.x += dx;
      copy.origin.y += dy;
    } else if (copy.type === 'polyline') {
      copy.points = copy.points.map((p: Point2D) => ({ x: p.x + dx, y: p.y + dy }));
    } else if (copy.type === 'arc') {
      copy.center.x += dx;
      copy.center.y += dy;
    } else if (copy.type === 'text') {
      copy.position.x += dx;
      copy.position.y += dy;
    }
    return copy;
  }
}

export class MovePlugin implements CADPlugin {
  public id = 'modify-move';
  public name = 'Move Tool';
  public version = '1.0.0';
  public category: 'modify' = 'modify';

  public init(core: CADCoreAPI): void {
    core.registerTool(new MoveTool());
  }

  public destroy(): void {}
}
