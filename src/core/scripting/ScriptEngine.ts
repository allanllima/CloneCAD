import {
  CADCoreAPI,
  CADScript,
  Point2D,
  ScriptExecutionResult,
  LineEntity,
  CircleEntity,
  RectangleEntity,
  TextEntity,
  PolylineEntity,
  PolylineVertex,
} from '../types';
import { AutoLISPInterpreter } from './AutoLISPInterpreter';

export class ScriptEngine {
  private lispInterpreter: AutoLISPInterpreter;

  constructor(private core: CADCoreAPI) {
    this.lispInterpreter = new AutoLISPInterpreter(core);
  }

  /**
   * Execute script code in JavaScript or AutoLISP
   */
  public execute(code: string, language: 'javascript' | 'lisp' = 'javascript'): ScriptExecutionResult {
    const startTime = performance.now();
    const logs: string[] = [];

    if (language === 'lisp') {
      try {
        const res = this.lispInterpreter.execute(code);
        const duration = performance.now() - startTime;
        this.core.requestRender();
        return {
          success: true,
          result: res.result,
          output: res.logs,
          executionTimeMs: Math.round(duration),
        };
      } catch (err: any) {
        const duration = performance.now() - startTime;
        return {
          success: false,
          error: err.message || String(err),
          output: [err.message || String(err)],
          executionTimeMs: Math.round(duration),
        };
      }
    }

    // JavaScript Sandbox Execution
    const customConsole = {
      log: (...args: any[]) => {
        const line = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
        logs.push(line);
      },
      warn: (...args: any[]) => {
        const line = `[WARN] ` + args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
        logs.push(line);
      },
      error: (...args: any[]) => {
        const line = `[ERROR] ` + args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
        logs.push(line);
      },
    };

    // Ergonomic CAD API Helpers
    const cad = {
      addLine: (start: Point2D, end: Point2D, layerId?: string, color?: string): LineEntity => {
        const ent: LineEntity = {
          id: `line_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
          type: 'line',
          layerId: layerId || this.core.getActiveLayer().id,
          color,
          start: { ...start },
          end: { ...end },
          visible: true,
        };
        this.core.addEntity(ent);
        return ent;
      },

      addCircle: (center: Point2D, radius: number, layerId?: string, color?: string): CircleEntity => {
        const ent: CircleEntity = {
          id: `circ_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
          type: 'circle',
          layerId: layerId || this.core.getActiveLayer().id,
          color,
          center: { ...center },
          radius,
          visible: true,
        };
        this.core.addEntity(ent);
        return ent;
      },

      addRectangle: (origin: Point2D, width: number, height: number, layerId?: string, color?: string): RectangleEntity => {
        const ent: RectangleEntity = {
          id: `rect_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
          type: 'rectangle',
          layerId: layerId || this.core.getActiveLayer().id,
          color,
          origin: { ...origin },
          width,
          height,
          visible: true,
        };
        this.core.addEntity(ent);
        return ent;
      },

      addText: (position: Point2D, text: string, fontSize = 12, layerId?: string, color?: string): TextEntity => {
        const ent: TextEntity = {
          id: `text_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
          type: 'text',
          layerId: layerId || this.core.getActiveLayer().id,
          color,
          position: { ...position },
          text,
          fontSize,
          visible: true,
        };
        this.core.addEntity(ent);
        return ent;
      },

      addPolyline: (points: PolylineVertex[], closed = false, layerId?: string, color?: string): PolylineEntity => {
        const ent: PolylineEntity = {
          id: `poly_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
          type: 'polyline',
          layerId: layerId || this.core.getActiveLayer().id,
          color,
          points: points.map((p) => ({ ...p })),
          vertices: points.map((p) => ({ ...p })),
          closed,
          visible: true,
        };
        this.core.addEntity(ent);
        return ent;
      },

      getEntities: () => this.core.getEntities(),
      getLayers: () => this.core.getLayers(),
      zoomExtents: () => this.core.zoomExtents(),
      clear: () => (this.core as any).clearEntities?.(),
    };

    try {
      // Execute wrapped function with sandbox arguments
      const runner = new Function('core', 'cad', 'console', 'Math', `
        "use strict";
        ${code}
      `);

      const result = runner(this.core, cad, customConsole, Math);
      const duration = performance.now() - startTime;
      this.core.requestRender();

      return {
        success: true,
        result,
        output: logs,
        executionTimeMs: Math.round(duration),
      };
    } catch (err: any) {
      const duration = performance.now() - startTime;
      return {
        success: false,
        error: err.message || String(err),
        output: [...logs, `[ERROR] ${err.message || String(err)}`],
        executionTimeMs: Math.round(duration),
      };
    }
  }

  /**
   * Return built-in sample scripts
   */
  public getTemplates(): CADScript[] {
    return [
      {
        id: 'structural_grid',
        name: 'Malha Estrutural de Eixos e Pilares',
        language: 'javascript',
        description: 'Gera eixos estruturais (linhas traço-ponto) e pilares 20x40cm nos cruzamentos com numeração automática.',
        code: `// Malha Estrutural de Pilares e Eixos
const colsX = 5;
const colsY = 4;
const spacingX = 120; // 1.2m
const spacingY = 100; // 1.0m
const colW = 20;
const colH = 40;

console.log("Iniciando geração da malha estrutural...");

// 1. Linhas de eixos
for (let i = 0; i < colsX; i++) {
  const x = i * spacingX;
  cad.addLine({ x, y: -40 }, { x, y: (colsY - 1) * spacingY + 40 }, '0', '#61afef');
  cad.addText({ x: x - 5, y: -60 }, String.fromCharCode(65 + i), 16, '0', '#61afef');
}

for (let j = 0; j < colsY; j++) {
  const y = j * spacingY;
  cad.addLine({ x: -40, y }, { x: (colsX - 1) * spacingX + 40, y }, '0', '#61afef');
  cad.addText({ x: -65, y: y - 5 }, String(j + 1), 16, '0', '#61afef');
}

// 2. Pilares nos cruzamentos
let pillarCount = 0;
for (let i = 0; i < colsX; i++) {
  for (let j = 0; j < colsY; j++) {
    const cx = i * spacingX;
    const cy = j * spacingY;
    cad.addRectangle({ x: cx - colW / 2, y: cy - colH / 2 }, colW, colH, '0', '#e5c07b');
    cad.addText({ x: cx - 8, y: cy - 4 }, "P" + (++pillarCount), 8, '0', '#ffffff');
  }
}

cad.zoomExtents();
console.log("Concluído: " + pillarCount + " pilares e malha de eixos criados com sucesso!");
`,
      },
      {
        id: 'archimedean_spiral',
        name: 'Espiral de Arquimedes Paramétrica',
        language: 'javascript',
        description: 'Gera uma espiral suave paramétrica usando polilinha.',
        code: `// Espiral Paramétrica
const points = [];
const numTurns = 5;
const steps = 150;
const b = 4; // taxa de expansão

for (let i = 0; i <= steps; i++) {
  const theta = (i / steps) * (numTurns * 2 * Math.PI);
  const r = b * theta;
  const x = r * Math.cos(theta);
  const y = r * Math.sin(theta);
  points.push({ x, y });
}

cad.addPolyline(points, false, '0', '#c678dd');
cad.zoomExtents();
console.log("Espiral gerada com " + points.length + " vértices.");
`,
      },
      {
        id: 'autolisp_grid',
        name: 'AutoLISP: Criação de Eixos e Círculos',
        language: 'lisp',
        description: 'Rotina clássica AutoLISP desenhando linhas e círculos concêntricos usando comandos nativos.',
        code: `; AutoLISP Clássico - Criação de Alvo / Mira
(prompt "Iniciando rotina AutoLISP...")
(setq cx 0)
(setq cy 0)

; Desenha círculos concêntricos
(command "CIRCLE" (list cx cy) 20)
(command "CIRCLE" (list cx cy) 40)
(command "CIRCLE" (list cx cy) 60)
(command "CIRCLE" (list cx cy) 80)

; Desenha cruz de eixos
(command "LINE" (list -100 cy) (list 100 cy) "")
(command "LINE" (list cx -100) (list cx 100) "")

; Insere texto identificador
(command "TEXT" (list -25 -120) 14 "ORIGEM DO PROJETO")
(command "ZOOM")

(prompt "Rotina AutoLISP finalizada com sucesso!")
`,
      },
    ];
  }
}
