import {
  CADCoreAPI,
  CADEntity,
  CADPlugin,
  CADPointerEvent,
  CADTool,
  Point2D,
} from '../../core/types';
import { AddEntityCommand } from '../../commands/AddEntityCommand';
import { CompositeCommand } from '../../commands/CompositeCommand';

export class CopyTool implements CADTool {
  public id = 'copy';
  public name = 'Copy';
  public category: 'modify' = 'modify';
  public cursor = 'crosshair';
  public shortcut = 'CO';

  private core: CADCoreAPI | null = null;
  private selectedEntities: CADEntity[] = [];
  private basePoint: Point2D | null = null;

  public onActivate(core: CADCoreAPI): void {
    this.core = core;
    this.selectedEntities = core.getSelectedEntities();
    this.basePoint = null;

    if (this.selectedEntities.length === 0) {
      core.setPrompt('COPY Select objects first, or pick object to copy:');
    } else {
      core.setPrompt(`COPY ${this.selectedEntities.length} object(s) selected. Specify base point:`);
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
        this.core.setPrompt('COPY Specify base point:');
      }
      return;
    }

    if (!this.basePoint) {
      this.basePoint = { ...e.world };
      this.core.setPrompt('COPY Specify second point:');
    } else {
      const dx = e.world.x - this.basePoint.x;
      const dy = e.world.y - this.basePoint.y;

      const newEntities = this.selectedEntities.map((ent) => {
        const copy = this.translateEntity(ent, dx, dy);
        copy.id = `${ent.type}_copy_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        return copy;
      });

      const cmds = newEntities.map((ent) => new AddEntityCommand(this.core!, ent));
      const batch = new CompositeCommand(cmds, `COPY ${newEntities.length} object(s)`);
      this.core.executeCommand(batch);

      this.cancel();
    }
  }

  public onPointerMove(e: CADPointerEvent): void {
    if (!this.core || !this.basePoint || this.selectedEntities.length === 0) return;

    const dx = e.world.x - this.basePoint.x;
    const dy = e.world.y - this.basePoint.y;

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

export class CopyPlugin implements CADPlugin {
  public id = 'modify-copy';
  public name = 'Copy Tool';
  public version = '1.0.0';
  public category: 'modify' = 'modify';

  public init(core: CADCoreAPI): void {
    core.registerTool(new CopyTool());
  }

  public destroy(): void {}
}
