import {
  CADEntity,
  CADGrip,
  LineEntity,
  CircleEntity,
  RectangleEntity,
  ArcEntity,
  PolylineEntity,
  TextEntity,
  BlockReferenceEntity,
  Point2D,
} from './types';

export class GripManager {
  private activeGrip: CADGrip | null = null;
  private originalEntityState: CADEntity | null = null;

  public getActiveGrip(): CADGrip | null {
    return this.activeGrip;
  }

  public setActiveGrip(grip: CADGrip | null, entity?: CADEntity): void {
    this.activeGrip = grip;
    this.originalEntityState = entity ? JSON.parse(JSON.stringify(entity)) : null;
  }

  public getOriginalEntityState(): CADEntity | null {
    return this.originalEntityState;
  }

  /**
   * Generates grips for selected entities
   */
  public generateGrips(entities: CADEntity[]): CADGrip[] {
    const grips: CADGrip[] = [];

    for (const ent of entities) {
      if (ent.visible === false) continue;
      grips.push(...this.getEntityGrips(ent));
    }

    return grips;
  }

  public getEntityGrips(ent: CADEntity): CADGrip[] {
    const grips: CADGrip[] = [];
    const id = ent.id;

    switch (ent.type) {
      case 'line': {
        const l = ent as LineEntity;
        grips.push({
          id: `${id}_start`,
          entityId: id,
          position: { ...l.start },
          type: 'endpoint',
        });
        grips.push({
          id: `${id}_mid`,
          entityId: id,
          position: { x: (l.start.x + l.end.x) / 2, y: (l.start.y + l.end.y) / 2 },
          type: 'midpoint',
        });
        grips.push({
          id: `${id}_end`,
          entityId: id,
          position: { ...l.end },
          type: 'endpoint',
        });
        break;
      }

      case 'circle': {
        const c = ent as CircleEntity;
        grips.push({
          id: `${id}_center`,
          entityId: id,
          position: { ...c.center },
          type: 'center',
        });
        // 4 Quadrants
        grips.push({
          id: `${id}_quad_r`,
          entityId: id,
          position: { x: c.center.x + c.radius, y: c.center.y },
          type: 'quadrant',
        });
        grips.push({
          id: `${id}_quad_t`,
          entityId: id,
          position: { x: c.center.x, y: c.center.y + c.radius },
          type: 'quadrant',
        });
        grips.push({
          id: `${id}_quad_l`,
          entityId: id,
          position: { x: c.center.x - c.radius, y: c.center.y },
          type: 'quadrant',
        });
        grips.push({
          id: `${id}_quad_b`,
          entityId: id,
          position: { x: c.center.x, y: c.center.y - c.radius },
          type: 'quadrant',
        });
        break;
      }

      case 'rectangle': {
        const r = ent as RectangleEntity;
        const p1 = r.origin;
        const p2 = { x: r.origin.x + r.width, y: r.origin.y };
        const p3 = { x: r.origin.x + r.width, y: r.origin.y + r.height };
        const p4 = { x: r.origin.x, y: r.origin.y + r.height };
        const center = { x: r.origin.x + r.width / 2, y: r.origin.y + r.height / 2 };

        grips.push(
          { id: `${id}_c1`, entityId: id, position: p1, type: 'vertex' },
          { id: `${id}_c2`, entityId: id, position: p2, type: 'vertex' },
          { id: `${id}_c3`, entityId: id, position: p3, type: 'vertex' },
          { id: `${id}_c4`, entityId: id, position: p4, type: 'vertex' },
          { id: `${id}_center`, entityId: id, position: center, type: 'center' }
        );
        break;
      }

      case 'arc': {
        const a = ent as ArcEntity;
        const startPt = {
          x: a.center.x + Math.cos(a.startAngle) * a.radius,
          y: a.center.y + Math.sin(a.startAngle) * a.radius,
        };
        const endPt = {
          x: a.center.x + Math.cos(a.endAngle) * a.radius,
          y: a.center.y + Math.sin(a.endAngle) * a.radius,
        };
        let midAngle = (a.startAngle + a.endAngle) / 2;
        if (a.endAngle < a.startAngle) midAngle = (a.startAngle + a.endAngle + Math.PI * 2) / 2;
        const midPt = {
          x: a.center.x + Math.cos(midAngle) * a.radius,
          y: a.center.y + Math.sin(midAngle) * a.radius,
        };

        grips.push(
          { id: `${id}_start`, entityId: id, position: startPt, type: 'endpoint' },
          { id: `${id}_mid`, entityId: id, position: midPt, type: 'midpoint' },
          { id: `${id}_end`, entityId: id, position: endPt, type: 'endpoint' },
          { id: `${id}_center`, entityId: id, position: { ...a.center }, type: 'center' }
        );
        break;
      }

      case 'polyline': {
        const poly = ent as PolylineEntity;
        poly.points.forEach((pt, index) => {
          grips.push({
            id: `${id}_v_${index}`,
            entityId: id,
            position: { x: pt.x, y: pt.y },
            type: 'vertex',
            index,
          });
        });
        break;
      }

      case 'insert': {
        const ins = ent as BlockReferenceEntity;
        grips.push({
          id: `${id}_insert`,
          entityId: id,
          position: { ...ins.position },
          type: 'insert',
        });
        break;
      }

      case 'text': {
        const txt = ent as TextEntity;
        grips.push({
          id: `${id}_pos`,
          entityId: id,
          position: { ...txt.position },
          type: 'endpoint',
        });
        break;
      }

      case 'dimension': {
        const dim = ent as any;
        if (dim.defPoint1) {
          grips.push({ id: `${id}_def1`, entityId: id, position: { ...dim.defPoint1 }, type: 'endpoint' });
        }
        if (dim.defPoint2) {
          grips.push({ id: `${id}_def2`, entityId: id, position: { ...dim.defPoint2 }, type: 'endpoint' });
        }
        if (dim.dimLinePoint) {
          grips.push({ id: `${id}_dimline`, entityId: id, position: { ...dim.dimLinePoint }, type: 'midpoint' });
        }
        if (dim.chordPoint) {
          grips.push({ id: `${id}_chord`, entityId: id, position: { ...dim.chordPoint }, type: 'endpoint' });
        }
        if (dim.centerPoint) {
          grips.push({ id: `${id}_center`, entityId: id, position: { ...dim.centerPoint }, type: 'center' });
        }
        break;
      }

      case 'multileader': {
        const ml = ent as any;
        grips.push({ id: `${id}_arrow`, entityId: id, position: { ...ml.arrowPoint }, type: 'endpoint' });
        grips.push({ id: `${id}_landing`, entityId: id, position: { ...ml.landingPoint }, type: 'midpoint' });
        grips.push({
          id: `${id}_shelf`,
          entityId: id,
          position: { x: ml.landingPoint.x + (ml.doglegLength || 8) * (ml.landingDirection || 1), y: ml.landingPoint.y },
          type: 'endpoint',
        });
        break;
      }
    }

    return grips;
  }

  /**
   * Hit test a point against a list of grips
   */
  public pickGrip(grips: CADGrip[], worldPt: Point2D, toleranceWorld: number): CADGrip | null {
    for (const grip of grips) {
      const dist = Math.hypot(grip.position.x - worldPt.x, grip.position.y - worldPt.y);
      if (dist <= toleranceWorld) {
        return grip;
      }
    }
    return null;
  }

  /**
   * Stretches/edits an entity based on the dragged grip position
   */
  public updateEntityWithGrip(
    orig: CADEntity,
    grip: CADGrip,
    newPos: Point2D
  ): CADEntity {
    const updated = JSON.parse(JSON.stringify(orig)) as CADEntity;

    switch (orig.type) {
      case 'line': {
        const l = updated as LineEntity;
        if (grip.id.endsWith('_start')) {
          l.start = { ...newPos };
        } else if (grip.id.endsWith('_end')) {
          l.end = { ...newPos };
        } else if (grip.id.endsWith('_mid')) {
          const oldMidX = (l.start.x + l.end.x) / 2;
          const oldMidY = (l.start.y + l.end.y) / 2;
          const dx = newPos.x - oldMidX;
          const dy = newPos.y - oldMidY;
          l.start.x += dx;
          l.start.y += dy;
          l.end.x += dx;
          l.end.y += dy;
        }
        break;
      }

      case 'circle': {
        const c = updated as CircleEntity;
        if (grip.type === 'center') {
          c.center = { ...newPos };
        } else if (grip.type === 'quadrant') {
          c.radius = Math.max(1, Math.hypot(newPos.x - c.center.x, newPos.y - c.center.y));
        }
        break;
      }

      case 'rectangle': {
        const r = updated as RectangleEntity;
        if (grip.type === 'center') {
          const dx = newPos.x - (r.origin.x + r.width / 2);
          const dy = newPos.y - (r.origin.y + r.height / 2);
          r.origin.x += dx;
          r.origin.y += dy;
        } else if (grip.id.endsWith('_c1')) {
          // origin corner
          const oppX = r.origin.x + r.width;
          const oppY = r.origin.y + r.height;
          r.origin.x = Math.min(newPos.x, oppX);
          r.origin.y = Math.min(newPos.y, oppY);
          r.width = Math.abs(oppX - newPos.x);
          r.height = Math.abs(oppY - newPos.y);
        } else if (grip.id.endsWith('_c3')) {
          // opposite corner
          r.width = Math.max(1, newPos.x - r.origin.x);
          r.height = Math.max(1, newPos.y - r.origin.y);
        } else if (grip.id.endsWith('_c2')) {
          // bottom-right
          r.width = Math.max(1, newPos.x - r.origin.x);
          const oppY = r.origin.y + r.height;
          r.origin.y = Math.min(newPos.y, oppY);
          r.height = Math.abs(oppY - newPos.y);
        } else if (grip.id.endsWith('_c4')) {
          // top-left
          const oppX = r.origin.x + r.width;
          r.origin.x = Math.min(newPos.x, oppX);
          r.width = Math.abs(oppX - newPos.x);
          r.height = Math.max(1, newPos.y - r.origin.y);
        }
        break;
      }

      case 'arc': {
        const a = updated as ArcEntity;
        if (grip.type === 'center') {
          a.center = { ...newPos };
        } else if (grip.id.endsWith('_start')) {
          const angle = Math.atan2(newPos.y - a.center.y, newPos.x - a.center.x);
          a.startAngle = angle < 0 ? angle + Math.PI * 2 : angle;
        } else if (grip.id.endsWith('_end')) {
          const angle = Math.atan2(newPos.y - a.center.y, newPos.x - a.center.x);
          a.endAngle = angle < 0 ? angle + Math.PI * 2 : angle;
        } else if (grip.id.endsWith('_mid')) {
          a.radius = Math.max(1, Math.hypot(newPos.x - a.center.x, newPos.y - a.center.y));
        }
        break;
      }

      case 'polyline': {
        const poly = updated as PolylineEntity;
        if (grip.index !== undefined && poly.points[grip.index]) {
          poly.points[grip.index].x = newPos.x;
          poly.points[grip.index].y = newPos.y;
        }
        break;
      }

      case 'insert': {
        const ins = updated as BlockReferenceEntity;
        ins.position = { ...newPos };
        break;
      }

      case 'text': {
        const txt = updated as TextEntity;
        txt.position = { ...newPos };
        break;
      }

      case 'dimension': {
        const dim = updated as any;
        if (grip.id.endsWith('_def1')) {
          dim.defPoint1 = { ...newPos };
        } else if (grip.id.endsWith('_def2')) {
          dim.defPoint2 = { ...newPos };
        } else if (grip.id.endsWith('_dimline')) {
          dim.dimLinePoint = { ...newPos };
        } else if (grip.id.endsWith('_chord')) {
          dim.chordPoint = { ...newPos };
        } else if (grip.id.endsWith('_center')) {
          dim.centerPoint = { ...newPos };
        }
        // Recalculate measurement
        if (dim.dimType === 'linear' && dim.defPoint1 && dim.defPoint2) {
          if (dim.linearOrientation === 'horizontal') {
            dim.measurement = Math.abs(dim.defPoint2.x - dim.defPoint1.x);
          } else if (dim.linearOrientation === 'vertical') {
            dim.measurement = Math.abs(dim.defPoint2.y - dim.defPoint1.y);
          } else {
            dim.measurement = Math.hypot(dim.defPoint2.x - dim.defPoint1.x, dim.defPoint2.y - dim.defPoint1.y);
          }
        } else if (dim.dimType === 'aligned' && dim.defPoint1 && dim.defPoint2) {
          dim.measurement = Math.hypot(dim.defPoint2.x - dim.defPoint1.x, dim.defPoint2.y - dim.defPoint1.y);
        } else if (dim.dimType === 'radial' && dim.centerPoint && dim.chordPoint) {
          dim.measurement = Math.hypot(dim.chordPoint.x - dim.centerPoint.x, dim.chordPoint.y - dim.centerPoint.y);
        } else if (dim.dimType === 'diameter' && dim.centerPoint && dim.chordPoint) {
          dim.measurement = 2 * Math.hypot(dim.chordPoint.x - dim.centerPoint.x, dim.chordPoint.y - dim.centerPoint.y);
        }
        break;
      }

      case 'multileader': {
        const ml = updated as any;
        if (grip.id.endsWith('_arrow')) {
          ml.arrowPoint = { ...newPos };
        } else if (grip.id.endsWith('_landing')) {
          ml.landingPoint = { ...newPos };
        } else if (grip.id.endsWith('_shelf')) {
          const dx = newPos.x - ml.landingPoint.x;
          ml.landingDirection = dx >= 0 ? 1 : -1;
          ml.doglegLength = Math.max(3, Math.abs(dx));
        }
        break;
      }
    }

    return updated;
  }
}
