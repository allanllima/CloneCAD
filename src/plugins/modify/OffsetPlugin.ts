import {
  CADCoreAPI,
  CADEntity,
  CADPlugin,
  CADPointerEvent,
  CADTool,
  Point2D,
} from '../../core/types';
import { AddEntityCommand } from '../../commands/AddEntityCommand';

export class OffsetTool implements CADTool {
  public id = 'offset';
  public name = 'Offset';
  public category: 'modify' = 'modify';
  public cursor = 'crosshair';
  public shortcut = 'O';

  private core: CADCoreAPI | null = null;
  private offsetDistance = 15;
  private selectedEntity: CADEntity | null = null;

  public onActivate(core: CADCoreAPI): void {
    this.core = core;
    this.selectedEntity = null;
    this.core.setPrompt(`OFFSET Specify offset distance <${this.offsetDistance}>:`);
  }

  public onDeactivate(core: CADCoreAPI): void {
    this.cancel();
  }

  public onPointerDown(e: CADPointerEvent): void {
    if (!this.core || e.button !== 0) return;

    if (!this.selectedEntity) {
      const selectionMgr = (this.core as any).getSelectionManager();
      const tol = 8 / this.core.getViewport().zoom;
      const clicked = selectionMgr.pickEntity(this.core.getEntities(), e.world, tol);

      if (clicked) {
        this.selectedEntity = clicked;
        this.core.setPrompt('OFFSET Specify point on side to offset:');
      } else {
        this.core.setPrompt('OFFSET Select object to offset:');
      }
    } else {
      const offsetEntity = this.createOffset(this.selectedEntity, e.world, this.offsetDistance);
      if (offsetEntity) {
        offsetEntity.id = `${this.selectedEntity.type}_offset_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        this.core.executeCommand(new AddEntityCommand(this.core, offsetEntity, 'OFFSET'));
        this.core.logCommandMessage(`OFFSET created at distance ${this.offsetDistance}.`);
      }
      this.cancel();
    }
  }

  public onPointerMove(e: CADPointerEvent): void {
    if (!this.core || !this.selectedEntity) return;

    const preview = this.createOffset(this.selectedEntity, e.world, this.offsetDistance);
    this.core.setPreviewEntity(preview);
  }

  public onPointerUp(e: CADPointerEvent): void {}

  public cancel(): void {
    this.selectedEntity = null;
    if (this.core) {
      this.core.setPreviewEntity(null);
      this.core.setPrompt('Command:');
      this.core.setActiveTool('select');
    }
  }

  private createOffset(ent: CADEntity, sidePoint: Point2D, dist: number): CADEntity | null {
    const copy = JSON.parse(JSON.stringify(ent));

    if (copy.type === 'line') {
      const dx = copy.end.x - copy.start.x;
      const dy = copy.end.y - copy.start.y;
      const len = Math.hypot(dx, dy);
      if (len < 1e-4) return null;

      // Normal vectors to the line
      const nx = -dy / len;
      const ny = dx / len;

      // Check which normal points towards sidePoint
      const midX = (copy.start.x + copy.end.x) / 2;
      const midY = (copy.start.y + copy.end.y) / 2;
      const toSideX = sidePoint.x - midX;
      const toSideY = sidePoint.y - midY;
      const sign = (toSideX * nx + toSideY * ny) >= 0 ? 1 : -1;

      copy.start.x += nx * dist * sign;
      copy.start.y += ny * dist * sign;
      copy.end.x += nx * dist * sign;
      copy.end.y += ny * dist * sign;
      return copy;
    } else if (copy.type === 'circle') {
      const d = Math.hypot(sidePoint.x - copy.center.x, sidePoint.y - copy.center.y);
      if (d >= copy.radius) {
        copy.radius += dist;
      } else {
        copy.radius = Math.max(1, copy.radius - dist);
      }
      return copy;
    } else if (copy.type === 'rectangle') {
      const midX = copy.origin.x + copy.width / 2;
      const midY = copy.origin.y + copy.height / 2;
      const isOutside =
        sidePoint.x < copy.origin.x ||
        sidePoint.x > copy.origin.x + copy.width ||
        sidePoint.y < copy.origin.y ||
        sidePoint.y > copy.origin.y + copy.height;

      if (isOutside) {
        copy.origin.x -= dist;
        copy.origin.y -= dist;
        copy.width += dist * 2;
        copy.height += dist * 2;
      } else {
        copy.origin.x += dist;
        copy.origin.y += dist;
        copy.width = Math.max(2, copy.width - dist * 2);
        copy.height = Math.max(2, copy.height - dist * 2);
      }
      return copy;
    } else if (copy.type === 'arc') {
      const d = Math.hypot(sidePoint.x - copy.center.x, sidePoint.y - copy.center.y);
      if (d >= copy.radius) {
        copy.radius += dist;
      } else {
        copy.radius = Math.max(1, copy.radius - dist);
      }
      return copy;
    }

    return null;
  }
}

export class OffsetPlugin implements CADPlugin {
  public id = 'modify-offset';
  public name = 'Offset Tool';
  public version = '1.0.0';
  public category: 'modify' = 'modify';

  public init(core: CADCoreAPI): void {
    core.registerTool(new OffsetTool());
  }

  public destroy(): void {}
}
