import { CADEntity, CADDiffResult } from '../types';

export class CADDiffEngine {
  /**
   * Compare two entity sets (Before vs After) and categorize into Added, Deleted, Modified, and Unchanged
   */
  public static diff(before: CADEntity[], after: CADEntity[]): CADDiffResult {
    const beforeMap = new Map<string, CADEntity>(before.map((e) => [e.id, e]));
    const afterMap = new Map<string, CADEntity>(after.map((e) => [e.id, e]));

    const added: CADEntity[] = [];
    const deleted: CADEntity[] = [];
    const modified: { before: CADEntity; after: CADEntity; changes: string[] }[] = [];
    const unchanged: CADEntity[] = [];

    // Find added and modified
    for (const [id, entAfter] of afterMap.entries()) {
      const entBefore = beforeMap.get(id);
      if (!entBefore) {
        added.push(entAfter);
      } else {
        const changes = this.detectEntityChanges(entBefore, entAfter);
        if (changes.length > 0) {
          modified.push({ before: entBefore, after: entAfter, changes });
        } else {
          unchanged.push(entAfter);
        }
      }
    }

    // Find deleted
    for (const [id, entBefore] of beforeMap.entries()) {
      if (!afterMap.has(id)) {
        deleted.push(entBefore);
      }
    }

    return {
      added,
      deleted,
      modified,
      unchanged,
      summary: {
        addedCount: added.length,
        deletedCount: deleted.length,
        modifiedCount: modified.length,
        unchangedCount: unchanged.length,
      },
    };
  }

  private static detectEntityChanges(a: CADEntity, b: CADEntity): string[] {
    const changes: string[] = [];

    if (a.type !== b.type) {
      changes.push(`Tipo alterado de ${a.type} para ${b.type}`);
      return changes;
    }

    if (a.layerId !== b.layerId) changes.push(`Camada alterada: "${a.layerId}" -> "${b.layerId}"`);
    if (a.color !== b.color) changes.push(`Cor alterada: "${a.color || 'padrão'}" -> "${b.color || 'padrão'}"`);

    switch (a.type) {
      case 'line': {
        const l1 = a as any, l2 = b as any;
        if (Math.hypot(l1.start.x - l2.start.x, l1.start.y - l2.start.y) > 1e-3) changes.push('Ponto inicial modificado');
        if (Math.hypot(l1.end.x - l2.end.x, l1.end.y - l2.end.y) > 1e-3) changes.push('Ponto final modificado');
        break;
      }

      case 'circle': {
        const c1 = a as any, c2 = b as any;
        if (Math.hypot(c1.center.x - c2.center.x, c1.center.y - c2.center.y) > 1e-3) changes.push('Centro modificado');
        if (Math.abs(c1.radius - c2.radius) > 1e-3) changes.push(`Raio alterado (${c1.radius.toFixed(1)} -> ${c2.radius.toFixed(1)})`);
        break;
      }

      case 'arc': {
        const a1 = a as any, a2 = b as any;
        if (Math.hypot(a1.center.x - a2.center.x, a1.center.y - a2.center.y) > 1e-3) changes.push('Centro modificado');
        if (Math.abs(a1.radius - a2.radius) > 1e-3) changes.push('Raio modificado');
        if (Math.abs(a1.startAngle - a2.startAngle) > 1e-3 || Math.abs(a1.endAngle - a2.endAngle) > 1e-3) {
          changes.push('Ângulos de abertura modificados');
        }
        break;
      }

      case 'rectangle': {
        const r1 = a as any, r2 = b as any;
        if (Math.hypot(r1.origin.x - r2.origin.x, r1.origin.y - r2.origin.y) > 1e-3) changes.push('Posição de origem modificada');
        if (Math.abs(r1.width - r2.width) > 1e-3 || Math.abs(r1.height - r2.height) > 1e-3) changes.push('Dimensões modificadas');
        break;
      }

      case 'text': {
        const t1 = a as any, t2 = b as any;
        if (t1.text !== t2.text) changes.push(`Texto alterado: "${t1.text}" -> "${t2.text}"`);
        if (Math.abs(t1.fontSize - t2.fontSize) > 1e-3) changes.push('Tamanho da fonte alterado');
        if (Math.hypot(t1.position.x - t2.position.x, t1.position.y - t2.position.y) > 1e-3) changes.push('Posição modificada');
        break;
      }

      case 'polyline': {
        const p1 = (a as any).points || (a as any).vertices || [];
        const p2 = (b as any).points || (b as any).vertices || [];
        if (p1.length !== p2.length) {
          changes.push(`Número de vértices alterado (${p1.length} -> ${p2.length})`);
        } else {
          let moved = false;
          for (let i = 0; i < p1.length; i++) {
            if (Math.hypot(p1[i].x - p2[i].x, p1[i].y - p2[i].y) > 1e-3) {
              moved = true;
              break;
            }
          }
          if (moved) changes.push('Vértices movidos');
        }
        break;
      }
    }

    return changes;
  }
}
