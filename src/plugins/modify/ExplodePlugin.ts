import {
  CADCoreAPI,
  CADEntity,
  CADPlugin,
  CADPointerEvent,
  CADTool,
  BlockReferenceEntity,
  RectangleEntity,
  PolylineEntity,
  LineEntity,
} from '../../core/types';
import { DeleteEntityCommand } from '../../commands/DeleteEntityCommand';
import { AddEntityCommand } from '../../commands/AddEntityCommand';
import { CompositeCommand } from '../../commands/CompositeCommand';
import { BulgeUtils } from '../../core/geometry/BulgeUtils';

export class ExplodeTool implements CADTool {
  public id = 'explode';
  public name = 'Explode';
  public category: 'modify' = 'modify';
  public cursor = 'crosshair';
  public shortcut = 'X';

  private core: CADCoreAPI | null = null;

  public onActivate(core: CADCoreAPI): void {
    this.core = core;
    const selected = core.getSelectedEntities();

    if (selected.length === 0) {
      core.setPrompt('EXPLODE Select objects to explode:');
    } else {
      this.explodeEntities(selected);
      this.cancel();
    }
  }

  public onDeactivate(core: CADCoreAPI): void {
    this.cancel();
  }

  public onPointerDown(e: CADPointerEvent): void {
    if (!this.core || e.button !== 0) return;

    const selectionMgr = (this.core as any).getSelectionManager();
    const tol = 8 / this.core.getViewport().zoom;
    const clicked = selectionMgr.pickEntity(this.core.getEntities(), e.world, tol);

    if (clicked) {
      this.explodeEntities([clicked]);
      this.cancel();
    }
  }

  public onPointerMove(e: CADPointerEvent): void {}
  public onPointerUp(e: CADPointerEvent): void {}

  public cancel(): void {
    if (this.core) {
      this.core.setPrompt('Command:');
      this.core.setActiveTool('select');
    }
  }

  private explodeEntities(entities: CADEntity[]): void {
    if (!this.core || entities.length === 0) return;

    const blockMgr = (this.core as any).getBlockManager();
    const commands: any[] = [];
    let explodedCount = 0;

    for (const ent of entities) {
      if (ent.type === 'insert') {
        const ins = ent as BlockReferenceEntity;
        const subEntities = blockMgr.explodeBlock(ins);
        if (subEntities.length > 0) {
          commands.push(new DeleteEntityCommand(this.core, ins));
          for (const sub of subEntities) {
            commands.push(new AddEntityCommand(this.core, sub));
          }
          explodedCount++;
        }
      } else if (ent.type === 'rectangle') {
        const r = ent as RectangleEntity;
        const p1 = r.origin;
        const p2 = { x: r.origin.x + r.width, y: r.origin.y };
        const p3 = { x: r.origin.x + r.width, y: r.origin.y + r.height };
        const p4 = { x: r.origin.x, y: r.origin.y + r.height };

        const lines: LineEntity[] = [
          { id: `line_exp_${Date.now()}_1`, type: 'line', layerId: r.layerId, color: r.color, start: p1, end: p2, visible: true },
          { id: `line_exp_${Date.now()}_2`, type: 'line', layerId: r.layerId, color: r.color, start: p2, end: p3, visible: true },
          { id: `line_exp_${Date.now()}_3`, type: 'line', layerId: r.layerId, color: r.color, start: p3, end: p4, visible: true },
          { id: `line_exp_${Date.now()}_4`, type: 'line', layerId: r.layerId, color: r.color, start: p4, end: p1, visible: true },
        ];

        commands.push(new DeleteEntityCommand(this.core, r));
        for (const l of lines) {
          commands.push(new AddEntityCommand(this.core, l));
        }
        explodedCount++;
      } else if (ent.type === 'polyline') {
        const poly = ent as PolylineEntity;
        const pts = poly.points;
        if (pts.length >= 2) {
          commands.push(new DeleteEntityCommand(this.core, poly));

          for (let i = 0; i < pts.length - 1; i++) {
            const p1 = pts[i];
            const p2 = pts[i + 1];
            if (p1.bulge) {
              const arc = BulgeUtils.toArc(p1, p2, p1.bulge);
              if (arc) {
                commands.push(new AddEntityCommand(this.core, {
                  id: `arc_exp_${Date.now()}_${i}`,
                  type: 'arc',
                  layerId: poly.layerId,
                  color: poly.color,
                  center: arc.center,
                  radius: arc.radius,
                  startAngle: arc.startAngle,
                  endAngle: arc.endAngle,
                  visible: true,
                }));
                continue;
              }
            }
            commands.push(new AddEntityCommand(this.core, {
              id: `line_exp_${Date.now()}_${i}`,
              type: 'line',
              layerId: poly.layerId,
              color: poly.color,
              start: { x: p1.x, y: p1.y },
              end: { x: p2.x, y: p2.y },
              visible: true,
            }));
          }

          if (poly.closed && pts.length > 2) {
            const last = pts[pts.length - 1];
            const first = pts[0];
            commands.push(new AddEntityCommand(this.core, {
              id: `line_exp_${Date.now()}_close`,
              type: 'line',
              layerId: poly.layerId,
              color: poly.color,
              start: { x: last.x, y: last.y },
              end: { x: first.x, y: first.y },
              visible: true,
            }));
          }
          explodedCount++;
        }
      }
    }

    if (commands.length > 0) {
      const comp = new CompositeCommand(commands, `EXPLODE ${explodedCount} Object(s)`);
      this.core.executeCommand(comp);
      this.core.clearSelection();
      this.core.logCommandMessage(`EXPLODE: Decomposed ${explodedCount} entity(ies).`);
    } else {
      this.core.logCommandMessage('EXPLODE: Cannot explode selected entity type(s).');
    }
  }
}

export class ExplodePlugin implements CADPlugin {
  public id = 'modify-explode';
  public name = 'Explode Tool';
  public version = '1.0.0';
  public category: 'modify' = 'modify';

  public init(core: CADCoreAPI): void {
    core.registerTool(new ExplodeTool());
  }

  public destroy(): void {}
}
