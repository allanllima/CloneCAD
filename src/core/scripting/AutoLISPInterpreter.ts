import { CADCoreAPI, Point2D } from '../types';

export type LispValue =
  | number
  | string
  | boolean
  | null
  | LispValue[]
  | ((args: LispValue[]) => LispValue);

export class AutoLISPInterpreter {
  private env: Map<string, LispValue> = new Map();
  private outputLogs: string[] = [];

  constructor(private core: CADCoreAPI) {
    this.initDefaultEnv();
  }

  private initDefaultEnv(): void {
    // Basic Arithmetic
    this.env.set('+', (args: LispValue[]) => args.reduce((acc: number, val) => acc + (Number(val) || 0), 0));
    this.env.set('-', (args: LispValue[]) => {
      if (args.length === 1) return -Number(args[0]);
      return args.slice(1).reduce((acc: number, val) => acc - (Number(val) || 0), Number(args[0]) || 0);
    });
    this.env.set('*', (args: LispValue[]) => args.reduce((acc: number, val) => acc * (Number(val) || 1), 1));
    this.env.set('/', (args: LispValue[]) => {
      if (args.length === 1) return 1 / (Number(args[0]) || 1);
      return args.slice(1).reduce((acc: number, val) => acc / (Number(val) || 1), Number(args[0]) || 1);
    });

    // Math Functions
    this.env.set('sqrt', (args: LispValue[]) => Math.sqrt(Number(args[0]) || 0));
    this.env.set('abs', (args: LispValue[]) => Math.abs(Number(args[0]) || 0));
    this.env.set('sin', (args: LispValue[]) => Math.sin(Number(args[0]) || 0));
    this.env.set('cos', (args: LispValue[]) => Math.cos(Number(args[0]) || 0));
    this.env.set('expt', (args: LispValue[]) => Math.pow(Number(args[0]) || 0, Number(args[1]) || 0));
    this.env.set('pi', Math.PI);

    // Comparisons
    this.env.set('=', (args: LispValue[]) => args[0] === args[1]);
    this.env.set('/=', (args: LispValue[]) => args[0] !== args[1]);
    this.env.set('<', (args: LispValue[]) => Number(args[0]) < Number(args[1]));
    this.env.set('<=', (args: LispValue[]) => Number(args[0]) <= Number(args[1]));
    this.env.set('>', (args: LispValue[]) => Number(args[0]) > Number(args[1]));
    this.env.set('>=', (args: LispValue[]) => Number(args[0]) >= Number(args[1]));

    // Lists & Geometry Points
    this.env.set('list', (args: LispValue[]) => [...args]);
    this.env.set('car', (args: LispValue[]) => (Array.isArray(args[0]) ? args[0][0] ?? null : null));
    this.env.set('cadr', (args: LispValue[]) => (Array.isArray(args[0]) ? args[0][1] ?? null : null));
    this.env.set('caddr', (args: LispValue[]) => (Array.isArray(args[0]) ? args[0][2] ?? null : null));

    this.env.set('distance', (args: LispValue[]) => {
      const p1 = this.toPoint(args[0]);
      const p2 = this.toPoint(args[1]);
      return Math.hypot(p2.x - p1.x, p2.y - p1.y);
    });

    this.env.set('polar', (args: LispValue[]) => {
      const p = this.toPoint(args[0]);
      const angle = Number(args[1]) || 0;
      const dist = Number(args[2]) || 0;
      return [p.x + Math.cos(angle) * dist, p.y + Math.sin(angle) * dist];
    });

    this.env.set('angle', (args: LispValue[]) => {
      const p1 = this.toPoint(args[0]);
      const p2 = this.toPoint(args[1]);
      return Math.atan2(p2.y - p1.y, p2.x - p1.x);
    });

    // Console & UI
    this.env.set('prompt', (args: LispValue[]) => {
      const msg = args.map(String).join(' ');
      this.outputLogs.push(msg);
      this.core.logCommandMessage(msg);
      return null;
    });

    this.env.set('princ', (args: LispValue[]) => {
      const msg = args.map(String).join(' ');
      this.outputLogs.push(msg);
      return args[0] ?? null;
    });

    this.env.set('alert', (args: LispValue[]) => {
      const msg = args.map(String).join(' ');
      this.outputLogs.push(`[ALERT] ${msg}`);
      this.core.logCommandMessage(`[AutoLISP Alert] ${msg}`);
      return null;
    });

    // CAD Command Bridge: (command "LINE" '(0 0) '(100 100) "")
    this.env.set('command', (args: LispValue[]) => {
      if (args.length === 0) return null;
      const cmdName = String(args[0]).toUpperCase();

      if (cmdName === 'LINE' && args.length >= 3) {
        const p1 = this.toPoint(args[1]);
        const p2 = this.toPoint(args[2]);
        this.core.addEntity({
          id: `line_lisp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          type: 'line',
          layerId: this.core.getActiveLayer().id,
          start: p1,
          end: p2,
          visible: true,
        });
        this.outputLogs.push(`LINE from (${p1.x}, ${p1.y}) to (${p2.x}, ${p2.y})`);
      } else if (cmdName === 'CIRCLE' && args.length >= 3) {
        const center = this.toPoint(args[1]);
        const radius = Number(args[2]) || 10;
        this.core.addEntity({
          id: `circ_lisp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          type: 'circle',
          layerId: this.core.getActiveLayer().id,
          center,
          radius,
          visible: true,
        });
        this.outputLogs.push(`CIRCLE at (${center.x}, ${center.y}) r=${radius}`);
      } else if (cmdName === 'RECTANGLE' && args.length >= 3) {
        const p1 = this.toPoint(args[1]);
        const p2 = this.toPoint(args[2]);
        const w = Math.abs(p2.x - p1.x);
        const h = Math.abs(p2.y - p1.y);
        const origin = { x: Math.min(p1.x, p2.x), y: Math.min(p1.y, p2.y) };
        this.core.addEntity({
          id: `rect_lisp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          type: 'rectangle',
          layerId: this.core.getActiveLayer().id,
          origin,
          width: w,
          height: h,
          visible: true,
        });
        this.outputLogs.push(`RECTANGLE at (${origin.x}, ${origin.y}) ${w}x${h}`);
      } else if (cmdName === 'TEXT' && args.length >= 4) {
        const pos = this.toPoint(args[1]);
        const height = Number(args[2]) || 12;
        const text = String(args[3]);
        this.core.addEntity({
          id: `text_lisp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          type: 'text',
          layerId: this.core.getActiveLayer().id,
          position: pos,
          fontSize: height,
          text,
          visible: true,
        });
        this.outputLogs.push(`TEXT "${text}" at (${pos.x}, ${pos.y})`);
      } else if (cmdName === 'ZOOM') {
        this.core.zoomExtents();
        this.outputLogs.push('ZOOM Extents executed.');
      } else {
        this.outputLogs.push(`[AutoLISP] Executed (command "${cmdName}")`);
      }
      return null;
    });
  }

  private toPoint(val: LispValue): Point2D {
    if (Array.isArray(val) && val.length >= 2) {
      return { x: Number(val[0]) || 0, y: Number(val[1]) || 0 };
    }
    if (val && typeof val === 'object' && 'x' in val && 'y' in val) {
      return { x: Number((val as any).x) || 0, y: Number((val as any).y) || 0 };
    }
    return { x: 0, y: 0 };
  }

  public execute(code: string): { result: any; logs: string[] } {
    this.outputLogs = [];
    const tokens = this.tokenize(code);
    let lastResult: any = null;

    let index = 0;
    while (index < tokens.length) {
      const [ast, nextIndex] = this.parse(tokens, index);
      index = nextIndex;
      if (ast !== undefined) {
        lastResult = this.evaluate(ast);
      }
    }

    return { result: lastResult, logs: [...this.outputLogs] };
  }

  private tokenize(code: string): string[] {
    const tokens: string[] = [];
    let cur = '';
    let inString = false;

    // Remove comments (; comment)
    const cleaned = code
      .split('\n')
      .map((line) => {
        const commentIdx = line.indexOf(';');
        return commentIdx >= 0 ? line.slice(0, commentIdx) : line;
      })
      .join('\n');

    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i];

      if (char === '"') {
        inString = !inString;
        cur += char;
        if (!inString) {
          tokens.push(cur);
          cur = '';
        }
      } else if (inString) {
        cur += char;
      } else if (char === '(' || char === ')') {
        if (cur.trim()) tokens.push(cur.trim());
        cur = '';
        tokens.push(char);
      } else if (/\s/.test(char)) {
        if (cur.trim()) tokens.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }

    if (cur.trim()) tokens.push(cur.trim());
    return tokens;
  }

  private parse(tokens: string[], index: number): [any, number] {
    if (index >= tokens.length) return [undefined, index];

    const token = tokens[index];

    if (token === '(') {
      const list: any[] = [];
      let i = index + 1;
      while (i < tokens.length && tokens[i] !== ')') {
        const [elem, nextI] = this.parse(tokens, i);
        if (elem !== undefined) list.push(elem);
        i = nextI;
      }
      return [list, i + 1]; // skip ')'
    }

    if (token === ')') {
      return [undefined, index + 1];
    }

    // Number literal
    if (!isNaN(Number(token))) {
      return [Number(token), index + 1];
    }

    // String literal
    if (token.startsWith('"') && token.endsWith('"')) {
      return [token.slice(1, -1), index + 1];
    }

    // Quoted list or symbol: '(1 2) or 'sym
    if (token.startsWith("'")) {
      const subToken = token.slice(1);
      if (subToken === '(') {
        const [list, nextI] = this.parse(['(', ...tokens.slice(index + 1)], 0);
        return [list, index + nextI];
      }
      return [subToken, index + 1];
    }

    // Symbol/Identifier
    return [token.toLowerCase(), index + 1];
  }

  private evaluate(expr: any): any {
    if (expr === null || expr === undefined) return null;
    if (typeof expr === 'number' || typeof expr === 'boolean') return expr;
    if (typeof expr === 'string') {
      if (this.env.has(expr)) {
        return this.env.get(expr);
      }
      return expr;
    }

    if (!Array.isArray(expr)) return expr;
    if (expr.length === 0) return [];

    const head = expr[0];

    // Special forms: setq, defun, if, progn, while, repeat
    if (head === 'setq') {
      let val = null;
      for (let i = 1; i < expr.length; i += 2) {
        const varName = String(expr[i]).toLowerCase();
        val = this.evaluate(expr[i + 1]);
        this.env.set(varName, val);
      }
      return val;
    }

    if (head === 'defun') {
      const funcName = String(expr[1]).toLowerCase();
      const params = (expr[2] || []).map((p: any) => String(p).toLowerCase());
      const body = expr.slice(3);

      const fn = (args: LispValue[]) => {
        const prevBindings = new Map<string, LispValue>();
        params.forEach((param: string, idx: number) => {
          prevBindings.set(param, this.env.get(param)!);
          this.env.set(param, args[idx] ?? null);
        });

        let result = null;
        for (const stmt of body) {
          result = this.evaluate(stmt);
        }

        // Restore bindings
        params.forEach((param: string) => {
          if (prevBindings.has(param)) {
            this.env.set(param, prevBindings.get(param)!);
          } else {
            this.env.delete(param);
          }
        });

        return result;
      };

      this.env.set(funcName, fn);
      return funcName;
    }

    if (head === 'if') {
      const cond = this.evaluate(expr[1]);
      if (cond) {
        return this.evaluate(expr[2]);
      } else if (expr.length > 3) {
        return this.evaluate(expr[3]);
      }
      return null;
    }

    if (head === 'progn') {
      let res = null;
      for (let i = 1; i < expr.length; i++) {
        res = this.evaluate(expr[i]);
      }
      return res;
    }

    if (head === 'repeat') {
      const count = Number(this.evaluate(expr[1])) || 0;
      let res = null;
      for (let i = 0; i < count; i++) {
        for (let j = 2; j < expr.length; j++) {
          res = this.evaluate(expr[j]);
        }
      }
      return res;
    }

    if (head === 'while') {
      let res = null;
      while (this.evaluate(expr[1])) {
        for (let j = 2; j < expr.length; j++) {
          res = this.evaluate(expr[j]);
        }
      }
      return res;
    }

    // Function call
    const fn = this.evaluate(head);
    if (typeof fn === 'function') {
      const evaluatedArgs = expr.slice(1).map((arg) => this.evaluate(arg));
      return fn(evaluatedArgs);
    }

    return expr;
  }
}
