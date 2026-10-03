import { PlotStyleTable, PenStyle } from './LayoutTypes';

export class PlotStyleManager {
  private tables: Map<string, PlotStyleTable> = new Map();

  constructor() {
    this.loadDefaultTables();
  }

  private loadDefaultTables(): void {
    // 1. Monochrome CTB (Classic CAD standard - all black with variable pen weights)
    const monochrome: PlotStyleTable = {
      id: 'monochrome.ctb',
      name: 'Monochrome (P&B)',
      description: 'Plota todas as cores em preto 100%, variando espessuras de pena',
      type: 'monochrome',
      defaultPen: {
        color: '#000000',
        lineWeight: 0.25,
        screening: 100,
      },
      layerMap: {
        walls: { color: '#000000', lineWeight: 0.60, screening: 100 },
        paredes: { color: '#000000', lineWeight: 0.60, screening: 100 },
        doors: { color: '#000000', lineWeight: 0.30, screening: 100 },
        portas: { color: '#000000', lineWeight: 0.30, screening: 100 },
        windows: { color: '#000000', lineWeight: 0.30, screening: 100 },
        janelas: { color: '#000000', lineWeight: 0.30, screening: 100 },
        dimensions: { color: '#000000', lineWeight: 0.18, screening: 100 },
        cotas: { color: '#000000', lineWeight: 0.18, screening: 100 },
        hatch: { color: '#000000', lineWeight: 0.13, screening: 80 },
        hachuras: { color: '#000000', lineWeight: 0.13, screening: 80 },
        eletrica: { color: '#000000', lineWeight: 0.35, screening: 100 },
        hidraulica: { color: '#000000', lineWeight: 0.35, screening: 100 },
        text: { color: '#000000', lineWeight: 0.25, screening: 100 },
        textos: { color: '#000000', lineWeight: 0.25, screening: 100 },
      },
    };

    // 2. Grayscale CTB (Converts colors to photometric grayscale)
    const grayscale: PlotStyleTable = {
      id: 'grayscale.ctb',
      name: 'Grayscale (Escala de Cinza)',
      description: 'Converte cores para tons de cinza com base na luminância óptica',
      type: 'grayscale',
      defaultPen: {
        color: '#000000',
        lineWeight: 0.25,
        screening: 100,
      },
    };

    // 3. Color / ACAD CTB (Full true color print)
    const acadColor: PlotStyleTable = {
      id: 'acad.ctb',
      name: 'ACAD (Cores da Tela)',
      description: 'Mantém as cores reais das entidades e camadas como exibidas na tela',
      type: 'color',
      defaultPen: {
        color: 'object_color',
        lineWeight: 0.25,
        screening: 100,
      },
    };

    // 4. Architectural CTB (ABNT/ISO line hierarchy)
    const architectural: PlotStyleTable = {
      id: 'architectural.ctb',
      name: 'Architectural ABNT/ISO',
      description: 'Padrão executivo: Alvenaria 0.70mm, Esquadrias 0.35mm, Cotas 0.18mm, Hachuras 0.09mm',
      type: 'architectural',
      defaultPen: {
        color: '#000000',
        lineWeight: 0.25,
        screening: 100,
      },
      layerMap: {
        walls: { color: '#000000', lineWeight: 0.70, screening: 100 },
        paredes: { color: '#000000', lineWeight: 0.70, screening: 100 },
        doors: { color: '#000000', lineWeight: 0.35, screening: 100 },
        portas: { color: '#000000', lineWeight: 0.35, screening: 100 },
        windows: { color: '#000000', lineWeight: 0.35, screening: 100 },
        janelas: { color: '#000000', lineWeight: 0.35, screening: 100 },
        furniture: { color: '#333333', lineWeight: 0.18, screening: 85 },
        mobiliario: { color: '#333333', lineWeight: 0.18, screening: 85 },
        dimensions: { color: '#000000', lineWeight: 0.18, screening: 100 },
        cotas: { color: '#000000', lineWeight: 0.18, screening: 100 },
        hatch: { color: '#555555', lineWeight: 0.09, screening: 70 },
        hachuras: { color: '#555555', lineWeight: 0.09, screening: 70 },
        structure: { color: '#000000', lineWeight: 0.80, screening: 100 },
        estrutura: { color: '#000000', lineWeight: 0.80, screening: 100 },
      },
    };

    this.registerTable(monochrome);
    this.registerTable(grayscale);
    this.registerTable(acadColor);
    this.registerTable(architectural);
  }

  public registerTable(table: PlotStyleTable): void {
    this.tables.set(table.id.toLowerCase(), table);
  }

  public getTable(id: string): PlotStyleTable | undefined {
    return this.tables.get(id.toLowerCase());
  }

  public getTables(): PlotStyleTable[] {
    return Array.from(this.tables.values());
  }

  /**
   * Resolves final printed color and line weight (in mm) for an entity
   */
  public resolvePenStyle(
    tableId: string,
    entityColor?: string,
    layerId?: string,
    layerColor?: string,
    entityWeight?: number
  ): PenStyle {
    const table = this.getTable(tableId) || this.getTable('monochrome.ctb')!;
    const effectiveColor = entityColor || layerColor || '#ffffff';
    const effectiveWeight = entityWeight !== undefined && entityWeight > 0 ? entityWeight : 0.25;

    // 1. Check layer-specific override in table
    if (layerId && table.layerMap && table.layerMap[layerId.toLowerCase()]) {
      const mapped = table.layerMap[layerId.toLowerCase()];
      return {
        color: mapped.color === 'object_color' ? effectiveColor : mapped.color,
        lineWeight: mapped.lineWeight,
        screening: mapped.screening,
      };
    }

    // 2. Check color-specific override in table
    if (table.colorMap && table.colorMap[effectiveColor.toLowerCase()]) {
      const mapped = table.colorMap[effectiveColor.toLowerCase()];
      return {
        color: mapped.color === 'object_color' ? effectiveColor : mapped.color,
        lineWeight: mapped.lineWeight,
        screening: mapped.screening,
      };
    }

    // 3. Table type defaults
    if (table.type === 'monochrome') {
      return {
        color: '#000000',
        lineWeight: effectiveWeight,
        screening: 100,
      };
    }

    if (table.type === 'grayscale') {
      return {
        color: this.rgbToGrayscale(effectiveColor),
        lineWeight: effectiveWeight,
        screening: 100,
      };
    }

    // Color or architectural fallback
    return {
      color: effectiveColor,
      lineWeight: effectiveWeight,
      screening: 100,
    };
  }

  /**
   * Converts a hex color (#RRGGBB or #RGB) into photometric grayscale
   */
  public rgbToGrayscale(hex: string): string {
    if (!hex || hex === 'object_color') return '#000000';
    let clean = hex.replace('#', '');
    if (clean.length === 3) {
      clean = clean.split('').map((c) => c + c).join('');
    }
    if (clean.length !== 6) return '#000000';

    const r = parseInt(clean.substring(0, 2), 16) || 0;
    const g = parseInt(clean.substring(2, 4), 16) || 0;
    const b = parseInt(clean.substring(4, 6), 16) || 0;

    // Perceptual luminance calculation (ITU-R BT.601 standard)
    const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    const lumHex = lum.toString(16).padStart(2, '0');
    return `#${lumHex}${lumHex}${lumHex}`;
  }
}
